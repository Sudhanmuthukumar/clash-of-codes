/**
 * Scramble Validator Engine
 * Supports multiple valid Python code arrangements using logical group-based ordering constraints.
 */

// Helper to permute an array of items
function permute(arr) {
    if (arr.length <= 1) return [arr];
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        const current = arr[i];
        const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
        const remainingPerms = permute(remaining);
        for (const p of remainingPerms) {
            result.push([current, ...p]);
        }
    }
    return result;
}

// Helper to compute Cartesian product of arrays of arrays
function cartesianProduct(arrays) {
    return arrays.reduce((acc, curr) => {
        const res = [];
        for (const a of acc) {
            for (const c of curr) {
                res.push([...a, ...c]);
            }
        }
        return res;
    }, [[]]);
}

/**
 * Parses ordering rules string and canonical finalCode into a list of valid line arrangements.
 * Each arrangement is an array of strings (trimmed code lines).
 */
function getValidArrangements(codeScrambleData) {
    const finalLines = (codeScrambleData.finalCode || '')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

    const validArrangements = [];
    // Always include canonical final code as first valid arrangement
    if (finalLines.length > 0) {
        validArrangements.push(finalLines);
    }

    let rules = null;
    if (codeScrambleData.orderingRules) {
        try {
            rules = typeof codeScrambleData.orderingRules === 'string'
                ? JSON.parse(codeScrambleData.orderingRules)
                : codeScrambleData.orderingRules;
        } catch (e) {
            rules = null;
        }
    }

    if (!rules) {
        return validArrangements;
    }

    // 1. If explicit alternative codes are provided
    if (Array.isArray(rules.alternativeCodes)) {
        for (const alt of rules.alternativeCodes) {
            if (typeof alt === 'string') {
                const altLines = alt.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                if (altLines.length === finalLines.length) {
                    validArrangements.push(altLines);
                }
            }
        }
    }

    // 2. If group-based blocks are provided
    // Structure: rules.blocks = [ { id, lines: string[] | string, orderGroup: number } ]
    if (Array.isArray(rules.blocks) && rules.blocks.length > 0) {
        // Group blocks by orderGroup
        const groupMap = new Map();
        for (const block of rules.blocks) {
            const grp = typeof block.orderGroup === 'number' ? block.orderGroup : 1;
            if (!groupMap.has(grp)) {
                groupMap.set(grp, []);
            }
            // Normalize lines
            const blockLines = Array.isArray(block.lines)
                ? block.lines.map(l => l.trim()).filter(l => l.length > 0)
                : (typeof block.lines === 'string' ? block.lines.split('\n').map(l => l.trim()).filter(l => l.length > 0) : []);
            
            if (blockLines.length > 0) {
                groupMap.get(grp).push(blockLines);
            }
        }

        // Sort groups ascending (OrderGroup 1 before OrderGroup 2, etc.)
        const sortedGroupKeys = Array.from(groupMap.keys()).sort((a, b) => a - b);

        // For each group, compute all permutations of its blocks
        const groupPermutations = [];
        for (const key of sortedGroupKeys) {
            const blocksInGroup = groupMap.get(key);
            // Permutations of blocks within this group
            const blockPerms = permute(blocksInGroup);
            // Flatten each block permutation into a line array
            const flattenedPerms = blockPerms.map(bPerm => bPerm.flat());
            groupPermutations.push(flattenedPerms);
        }

        // Cartesian product across sequential groups
        if (groupPermutations.length > 0) {
            const allCombos = cartesianProduct(groupPermutations);
            for (const combo of allCombos) {
                if (combo.length === finalLines.length) {
                    validArrangements.push(combo);
                }
            }
        }
    }

    // Deduplicate arrangements
    const seen = new Set();
    const uniqueArrangements = [];
    for (const arr of validArrangements) {
        const key = arr.join('|||');
        if (!seen.has(key)) {
            seen.add(key);
            uniqueArrangements.push(arr);
        }
    }

    return uniqueArrangements.length > 0 ? uniqueArrangements : [finalLines];
}

/**
 * Checks if the current line order exactly matches any valid arrangement.
 */
function isArrangementValid(arrangedLines, validArrangements) {
    const candidate = arrangedLines.map(l => (l || '').trim());
    for (const valid of validArrangements) {
        if (candidate.length !== valid.length) continue;
        let match = true;
        for (let i = 0; i < valid.length; i++) {
            if (candidate[i] !== valid[i]) {
                match = false;
                break;
            }
        }
        if (match) return true;
    }
    return false;
}

/**
 * Finds the valid arrangement that best matches the candidate arrangement
 * (maximizes matching slots). Ties default to the canonical arrangement (index 0).
 */
function findClosestValidArrangement(arrangedLines, validArrangements) {
    const candidate = arrangedLines.map(l => (l || '').trim());
    let best = validArrangements[0];
    let maxMatches = -1;

    for (const valid of validArrangements) {
        let matches = 0;
        const len = Math.min(candidate.length, valid.length);
        for (let i = 0; i < len; i++) {
            if (candidate[i] === valid[i]) {
                matches++;
            }
        }
        if (matches > maxMatches) {
            maxMatches = matches;
            best = valid;
        }
    }

    return best;
}

/**
 * Computes boolean array of matching lines based on the closest valid arrangement.
 */
function computeCorrectPositions(arrangedLineIndices, shuffledLines, validArrangements) {
    const arrangedLines = arrangedLineIndices.map(idx => (shuffledLines[idx] || '').trim());
    const closestValid = findClosestValidArrangement(arrangedLines, validArrangements);

    return arrangedLines.map((line, pos) => {
        return line === (closestValid[pos] || '').trim();
    });
}

/**
 * Resolves the target and source indices for applying a clue/hint toward the closest valid arrangement.
 */
function resolveClue(lineOrder, shuffledLines, validArrangements) {
    const arrangedLines = lineOrder.map(idx => (shuffledLines[idx] || '').trim());
    const closestValid = findClosestValidArrangement(arrangedLines, validArrangements);

    let targetIdx = -1;
    for (let i = 0; i < closestValid.length; i++) {
        if (arrangedLines[i] !== closestValid[i]) {
            targetIdx = i;
            break;
        }
    }

    if (targetIdx === -1) {
        return { allAligned: true };
    }

    const expectedLine = closestValid[targetIdx];
    let sourceIdx = -1;
    for (let j = 0; j < lineOrder.length; j++) {
        if (j === targetIdx) continue;
        const currentLine = (shuffledLines[lineOrder[j]] || '').trim();
        if (currentLine === expectedLine) {
            sourceIdx = j;
            break;
        }
    }

    return {
        allAligned: false,
        targetIdx,
        sourceIdx,
        expectedLine
    };
}

module.exports = {
    getValidArrangements,
    isArrangementValid,
    findClosestValidArrangement,
    computeCorrectPositions,
    resolveClue
};
