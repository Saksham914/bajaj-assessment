const express = require("express");
const cors = require("cors");

const app = express();

// Enable CORS for frontend calling from different origins
app.use(cors());
app.use(express.json());

app.post("/bfhl", (req, res) => {
    let payload = req.body.data;
    
    // check if it's an array
    if (!Array.isArray(payload)) {
        return res.status(400).json({ error: "Send data as an array please" });
    }

    const badInputs = [];
    const repeatedEdges = [];
    const parsedEdges = [];
    
    const uniqueCheck = new Set();
    const dupTracker = new Set();

    // process inputs
    for (const val of payload) {
        if (typeof val !== 'string') {
            badInputs.push(val);
            continue;
        }

        let str = val.trim();
        
        if (!/^[A-Z]->[A-Z]$/.test(str)) {
            badInputs.push(val);
            continue;
        }

        let [p, c] = str.split('->');
        
        // self loops check
        if (p === c) {
            badInputs.push(val);
            continue;
        }

        if (uniqueCheck.has(str)) {
            if (!dupTracker.has(str)) {
                dupTracker.add(str);
                repeatedEdges.push(str);
            }
        } else {
            uniqueCheck.add(str);
            parsedEdges.push({ p, c, raw: str });
        }
    }

    // build graph structures
    const adjMap = {};
    const parentRef = {};
    const nodeSet = new Set();

    for (let i = 0; i < parsedEdges.length; i++) {
        let parentNode = parsedEdges[i].p;
        let childNode = parsedEdges[i].c;

        nodeSet.add(parentNode);
        nodeSet.add(childNode);
        
        if (!adjMap[parentNode]) adjMap[parentNode] = [];
        if (!adjMap[childNode]) adjMap[childNode] = [];

        // only one parent allowed per rules
        if (parentRef[childNode] !== undefined) {
            continue; 
        }

        parentRef[childNode] = parentNode;
        adjMap[parentNode].push(childNode);
    }

    const startNodes = [];
    nodeSet.forEach(node => {
        if (!parentRef[node]) {
            startNodes.push(node);
        }
    });

    const results = [];
    let treeCount = 0;
    let cycleCount = 0;
    let maxD = 0;
    let biggestRoot = "";

    const visited = new Set();
    const pathStack = new Set(); 

    // recursive DFS to build out the tree
    function walkGraph(currNode, depthLevel) {
        visited.add(currNode);
        pathStack.add(currNode);

        let subTree = {};
        let isCyclic = false;
        let maxChildDepth = 0;

        let connections = adjMap[currNode] || [];
        
        connections.forEach(nxt => {
            if (!visited.has(nxt)) {
                let out = walkGraph(nxt, depthLevel + 1);
                subTree[nxt] = out.treeObj;
                if (out.cycleFlag) isCyclic = true;
                if (out.d > maxChildDepth) maxChildDepth = out.d;
            } else if (pathStack.has(nxt)) {
                // we hit a loop!
                // console.log("loop found at", nxt)
                isCyclic = true;
            }
        });

        pathStack.delete(currNode);
        
        return {
            treeObj: subTree,
            cycleFlag: isCyclic,
            d: isCyclic ? 0 : 1 + maxChildDepth
        };
    }

    // go through the main roots
    for (let i = 0; i < startNodes.length; i++) {
        let r = startNodes[i];
        let resData = walkGraph(r, 1);
        
        let struct = {
            root: r,
            tree: { [r]: resData.treeObj }
        };

        if (resData.cycleFlag) {
            struct.has_cycle = true;
            struct.tree = {};
            cycleCount++;
        } else {
            struct.depth = resData.d;
            treeCount++;
            
            // logic for max depth tiebreaker
            if (resData.d > maxD) {
                maxD = resData.d;
                biggestRoot = r;
            } else if (resData.d === maxD) {
                if (biggestRoot === "" || r < biggestRoot) {
                    biggestRoot = r;
                }
            }
        }
        
        results.push(struct);
    }

    // catch isolated cycles that had no root
    nodeSet.forEach(nd => {
        if (!visited.has(nd)) {
            let resData = walkGraph(nd, 1);
            if (resData.cycleFlag) {
                cycleCount++;
                results.push({
                    root: nd,
                    tree: {},
                    has_cycle: true
                });
            }
        }
    });

    res.status(200).json({
        user_id: "saksham_shukla_24042026",
        email_id: "saksham.shukla@example.com",
        college_roll_number: "ROLL12345",
        hierarchies: results,
        invalid_entries: badInputs,
        duplicate_edges: repeatedEdges,
        summary: {
            total_trees: treeCount,
            total_cycles: cycleCount,
            largest_tree_root: biggestRoot
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend listening at port ${PORT}`);
});
