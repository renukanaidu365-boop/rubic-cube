import { RubiksCube } from './cube.js';

// ── Init ──
const container = document.getElementById('cube-container');
const cube = new RubiksCube(container);

// ── DOM refs ──
const movesList = document.getElementById('moves-list');
const statusEl = document.getElementById('solution-status');

// ── Variables ──
let currentSolutionMoves = [];
let currentStepIndex = 0;
let isPreviewing = false;
let previewInterval = null;

// ── SCRAMBLE BUTTON ──
document.getElementById('btn-scramble').addEventListener('click', async () => {
    console.log('🔘 Scramble button clicked!');
    
    if (cube.isScrambling) {
        console.log('⚠️ Already scrambling, ignoring click');
        return;
    }
    
    statusEl.textContent = '🔀 Scrambling...';
    movesList.innerHTML = '';
    currentSolutionMoves = [];
    currentStepIndex = 0;
    isPreviewing = false;
    
    if (previewInterval) {
        clearInterval(previewInterval);
        previewInterval = null;
    }
    
    try {
        // Just scramble - don't reset here since scramble does it
        await cube.scramble();
        
        statusEl.textContent = '🔀 Scrambled! Click "Solve" to solve it';
        console.log('✅ Scramble complete! Cube should be mixed.');
        
        // Visual indicator that cube is scrambled
        document.getElementById('cube-container').style.border = '3px solid #ff6b6b';
        
    } catch (err) {
        console.error('❌ Scramble error:', err);
        statusEl.textContent = '❌ Scramble failed';
    }
});

// ── RESET BUTTON ──
document.getElementById('btn-reset').addEventListener('click', () => {
    console.log('🔘 Reset button clicked');
    cube.reset();
    movesList.innerHTML = '';
    statusEl.textContent = '↺ Reset to solved';
    currentSolutionMoves = [];
    currentStepIndex = 0;
    isPreviewing = false;
    
    if (previewInterval) {
        clearInterval(previewInterval);
        previewInterval = null;
    }
    
    document.getElementById('cube-container').style.border = 'none';
});

// ── SOLVE BUTTON ──
document.getElementById('btn-solve').addEventListener('click', async () => {
    console.log('🔘 Solve button clicked');
    
    if (cube.isSolved) {
        statusEl.textContent = '⚠️ Cube is already solved! Try scrambling first.';
        return;
    }
    
    statusEl.textContent = '🧠 Solving...';
    currentStepIndex = 0;
    isPreviewing = false;
    
    if (previewInterval) {
        clearInterval(previewInterval);
        previewInterval = null;
    }

    try {
        // Use inverse of scramble moves to solve
        if (cube.scrambleMoves && cube.scrambleMoves.length > 0) {
            console.log('🔍 Solving using inverse of scramble...');
            console.log('📝 Scramble moves:', cube.scrambleMoves.join(' '));
            
            // Create inverse of scramble moves
            const inverseMoves = [...cube.scrambleMoves].reverse().map(move => {
                if (move.endsWith("'")) return move.slice(0, -1);
                if (move.endsWith("2")) return move;
                return move + "'";
            });
            
            console.log('🔄 Solution moves:', inverseMoves.join(' '));
            
            statusEl.textContent = `🧠 Solving (${inverseMoves.length} moves)...`;
            currentSolutionMoves = inverseMoves;
            displaySolution(inverseMoves);
            
            // Execute the inverse moves to solve the cube
            for (let i = 0; i < inverseMoves.length; i++) {
                await cube.performMove(inverseMoves[i]);
                highlightMove(i);
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            cube.isSolved = true;
            statusEl.textContent = `✅ Solved! (${inverseMoves.length} moves)`;
            document.getElementById('cube-container').style.border = '3px solid #00ff88';
            
            // Clear scramble moves since cube is now solved
            cube.scrambleMoves = [];
            
        } else {
            statusEl.textContent = '❌ No scramble history found. Please scramble first!';
        }
        
    } catch (err) {
        console.error('Error during solve:', err);
        statusEl.textContent = '❌ Error: ' + err.message;
    }
});

// ── PREVIEW ALL BUTTON ──
document.getElementById('btn-preview').addEventListener('click', async () => {
    if (currentSolutionMoves.length === 0) {
        statusEl.textContent = '⚠️ Please solve the cube first!';
        return;
    }
    
    if (isPreviewing) {
        isPreviewing = false;
        if (previewInterval) {
            clearInterval(previewInterval);
            previewInterval = null;
        }
        statusEl.textContent = '⏸️ Preview paused';
        return;
    }
    
    // Reset cube first
    cube.reset();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    isPreviewing = true;
    currentStepIndex = 0;
    statusEl.textContent = '👁️ Previewing solution...';
    
    previewInterval = setInterval(async () => {
        if (currentStepIndex >= currentSolutionMoves.length) {
            clearInterval(previewInterval);
            previewInterval = null;
            isPreviewing = false;
            statusEl.textContent = '✅ Preview complete!';
            return;
        }
        
        const move = currentSolutionMoves[currentStepIndex];
        await cube.performMove(move);
        highlightMove(currentStepIndex);
        currentStepIndex++;
    }, cube.speed + 50);
});

// ── NEXT STEP BUTTON ──
document.getElementById('btn-next').addEventListener('click', async () => {
    if (currentSolutionMoves.length === 0) {
        statusEl.textContent = '⚠️ Please solve the cube first!';
        return;
    }
    
    if (currentStepIndex >= currentSolutionMoves.length) {
        statusEl.textContent = '✅ All steps completed!';
        return;
    }
    
    if (previewInterval) {
        clearInterval(previewInterval);
        previewInterval = null;
        isPreviewing = false;
    }
    
    const move = currentSolutionMoves[currentStepIndex];
    await cube.performMove(move);
    highlightMove(currentStepIndex);
    currentStepIndex++;
    statusEl.textContent = `▶ Step ${currentStepIndex}/${currentSolutionMoves.length}`;
});

// ── SPEED CONTROL ──
document.getElementById('speed-control').addEventListener('input', (e) => {
    cube.speed = parseInt(e.target.value);
});

// ── KEYBOARD CONTROLS ──
document.addEventListener('keydown', async (e) => {
    const key = e.key.toUpperCase();
    const validMoves = ['R', 'L', 'U', 'D', 'F', 'B'];
    
    if (validMoves.includes(key)) {
        let move = key;
        if (e.shiftKey) {
            move = key + "'";
        }
        
        if (!cube.isScrambling && !cube.isAnimating) {
            await cube.performMove(move);
            statusEl.textContent = `🔄 Manual move: ${move}`;
            cube.isSolved = false;
            document.getElementById('cube-container').style.border = '3px solid #ff6b6b';
        }
    }
});

// ── DISPLAY SOLUTION ──
function displaySolution(moves) {
    movesList.innerHTML = '';
    moves.forEach((move, i) => {
        const span = document.createElement('span');
        span.className = 'move-step';
        span.textContent = move;
        span.dataset.index = i;
        movesList.appendChild(span);
    });
}

// ── HIGHLIGHT MOVE ──
function highlightMove(index) {
    const steps = movesList.querySelectorAll('.move-step');
    steps.forEach((el, i) => {
        el.classList.toggle('active', i === index);
        if (i < index) el.classList.add('done');
    });
}

console.log('🚀 CubeAI loaded! Use the buttons to scramble and solve the cube.');