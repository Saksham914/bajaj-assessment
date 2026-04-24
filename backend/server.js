const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/bfhl', (req, res) => {
    const data = req.body.data;

    if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: "Invalid request body. 'data' must be an array." });
    }

    const invalid_entries = [];
    const duplicate_edges = [];
    const valid_edges = [];
    const seen_edges = new Set();
    const duplicate_set = new Set();

    // 1 & 2. Validation & Duplicates
    data.forEach(item => {
        if (typeof item !== 'string') {
            invalid_entries.push(item);
            return;
        }

        const trimmed = item.trim();

        // Regex: Single Uppercase A-Z, exactly "->", Single Uppercase A-Z
        const isValidFormat = /^[A-Z]->[A-Z]$/.test(trimmed);
        if (!isValidFormat) {
            invalid_entries.push(item);
            return;
        }

        const [parent, child] = trimmed.split('->');

        if (parent === child) {
            invalid_entries.push(item);
            return;
        }

        if (seen_edges.has(trimmed)) {
            if (!duplicate_set.has(trimmed)) {
                duplicate_set.add(trimmed);
                duplicate_edges.push(trimmed);
            }
        } else {
            seen_edges.add(trimmed);
            valid_edges.push({ parent, child, original: trimmed });
        }
    });

    // 3. Graph Building
    // Adjacency list
    const adj = {};
    const hasParent = {};
    const nodes = new Set();

    valid_edges.forEach(({ parent, child }) => {
        nodes.add(parent);
        nodes.add(child);

        if (!adj[parent]) adj[parent] = [];
        if (!adj[child]) adj[child] = [];

        // If a node has multiple parents, only keep the first occurrence
        if (hasParent[child] !== undefined) {
            // Already has a parent, ignore this edge for the graph
            return;
        }

        hasParent[child] = parent;
        adj[parent].push(child);
    });

    // 4. Root Detection
    // Roots = nodes that never appear as a child
    const roots = [];
    nodes.forEach(node => {
        if (hasParent[node] === undefined) {
            roots.push(node);
        }
    });

    // 5, 6, 7. Tree Construction, Cycle Detection, Depth
    const hierarchies = [];
    let total_trees = 0;
    let total_cycles = 0;
    let max_depth = 0;
    let largest_tree_root = "";

    const visited = new Set();
    const recursionStack = new Set();

    function buildTreeAndCheckCycle(node, currentDepth) {
        visited.add(node);
        recursionStack.add(node);

        const tree = {};
        let has_cycle = false;
        let maxChildDepth = 0;

        for (const neighbor of (adj[node] || [])) {
            if (!visited.has(neighbor)) {
                const result = buildTreeAndCheckCycle(neighbor, currentDepth + 1);
                tree[neighbor] = result.tree;
                if (result.has_cycle) has_cycle = true;
                maxChildDepth = Math.max(maxChildDepth, result.depth);
            } else if (recursionStack.has(neighbor)) {
                has_cycle = true;
            }
        }

        recursionStack.delete(node);
        return {
            tree,
            has_cycle,
            depth: has_cycle ? 0 : 1 + maxChildDepth
        };
    }

    // Process roots
    roots.forEach(root => {
        const result = buildTreeAndCheckCycle(root, 1);

        const hierarchy = {
            root: root,
            tree: {}
        };
        hierarchy.tree[root] = result.tree;

        if (result.has_cycle) {
            hierarchy.has_cycle = true;
            hierarchy.tree = {};
            total_cycles++;
        } else {
            hierarchy.depth = result.depth;
            total_trees++;

            // Check for largest tree root
            if (result.depth > max_depth) {
                max_depth = result.depth;
                largest_tree_root = root;
            } else if (result.depth === max_depth) {
                if (largest_tree_root === "" || root < largest_tree_root) {
                    largest_tree_root = root;
                }
            }
        }

        hierarchies.push(hierarchy);
    });

    // Check for isolated cycles (nodes not reachable from any root)
    nodes.forEach(node => {
        if (!visited.has(node)) {
            // Must be a cycle
            const result = buildTreeAndCheckCycle(node, 1);
            if (result.has_cycle) {
                total_cycles++;
                hierarchies.push({
                    root: node,
                    tree: {},
                    has_cycle: true
                });
            }
        }
    });

    res.json({
        user_id: "saksham_shukla_24042026",
        email_id: "saksham.shukla@example.com",
        college_roll_number: "ROLL12345",
        hierarchies: hierarchies,
        invalid_entries: invalid_entries,
        duplicate_edges: duplicate_edges,
        summary: {
            total_trees: total_trees,
            total_cycles: total_cycles,
            largest_tree_root: largest_tree_root
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
