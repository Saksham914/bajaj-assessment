window.onload = function() {
    let txtArea = document.getElementById('nodeInput');
    let analyzeBtn = document.getElementById('submitBtn');
    let resetBtn = document.getElementById('clearBtn');
    let errMsg = document.getElementById('errorMsg');
    let outputSection = document.getElementById('resultsArea');
    
    let tTrees = document.getElementById('valTotalTrees');
    let tCycles = document.getElementById('valTotalCycles');
    let lRoot = document.getElementById('valLargestRoot');
    
    let hList = document.getElementById('hierarchiesList');
    let invList = document.getElementById('listInvalids');
    let dupList = document.getElementById('listDuplicates');
    let cInvalids = document.getElementById('countInvalids');
    let cDuplicates = document.getElementById('countDuplicates');
    let jOut = document.getElementById('jsonOutput');

    let endpoint = 'https://saksham-bajaj.onrender.com/bfhl';

    function displayError(str) {
        errMsg.innerText = str;
        errMsg.style.display = 'block';
    }

    analyzeBtn.onclick = function() {
        let rawInput = txtArea.value.trim();
        
        if (rawInput === "") {
            displayError("Input cannot be empty");
            return;
        }

        let parsedArr = [];
        try {
            parsedArr = JSON.parse(rawInput);
            if (!Array.isArray(parsedArr)) {
                throw new Error("not array");
            }
        } catch (e) {
            let splitData = rawInput.split(/[\n,]+/);
            for (let k = 0; k < splitData.length; k++) {
                let trimmed = splitData[k].trim();
                if (trimmed.length > 0) {
                    parsedArr.push(trimmed);
                }
            }
        }

        errMsg.style.display = 'none';
        analyzeBtn.innerHTML = 'Processing...';
        analyzeBtn.disabled = true;

        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: parsedArr })
        })
        .then(response => {
            return response.json().then(data => ({ ok: response.ok, body: data }));
        })
        .then(result => {
            if (!result.ok) {
                displayError(result.body.error || "Server issue");
                outputSection.style.display = 'none';
            } else {
                // console.log(result.body);
                showData(result.body);
            }
        })
        .catch(err => {
            displayError("Network or server error");
            outputSection.style.display = 'none';
        })
        .finally(() => {
            analyzeBtn.innerHTML = 'Analyze Graph';
            analyzeBtn.disabled = false;
        });
    };

    resetBtn.onclick = function() {
        txtArea.value = '';
        outputSection.style.display = 'none';
        errMsg.style.display = 'none';
    };

    function generateTreeString(obj, spaces = '') {
        let res = '';
        let keysArr = Object.keys(obj);
        for (let idx = 0; idx < keysArr.length; idx++) {
            let k = keysArr[idx];
            let lastItem = (idx === keysArr.length - 1);
            
            if (lastItem) {
                res += spaces + '└── ' + k + '\n';
                res += generateTreeString(obj[k], spaces + '    ');
            } else {
                res += spaces + '├── ' + k + '\n';
                res += generateTreeString(obj[k], spaces + '│   ');
            }
        }
        return res;
    }

    function populateList(ulNode, itemsArr) {
        ulNode.innerHTML = '';
        if (itemsArr.length == 0) {
            ulNode.className = 'issue-list empty';
            let emptyLi = document.createElement('li');
            emptyLi.innerText = 'None';
            ulNode.appendChild(emptyLi);
            return;
        }
        
        ulNode.className = 'issue-list';
        for(let j=0; j<itemsArr.length; j++) {
            let node = document.createElement('li');
            node.innerText = itemsArr[j];
            ulNode.appendChild(node);
        }
    }

    function showData(apiResp) {
        tTrees.innerText = apiResp.summary.total_trees;
        tCycles.innerText = apiResp.summary.total_cycles;
        lRoot.innerText = apiResp.summary.largest_tree_root || '-';

        hList.innerHTML = '';
        if (apiResp.hierarchies && apiResp.hierarchies.length > 0) {
            for(let i=0; i<apiResp.hierarchies.length; i++) {
                let hData = apiResp.hierarchies[i];
                
                let boxWrap = document.createElement('div');
                boxWrap.className = 'tree-box';
                
                let headDiv = document.createElement('div');
                headDiv.className = 'tree-box-header';
                
                let innerTextHtml = '<span>Root: <strong>' + hData.root + '</strong></span>';
                if (hData.has_cycle) {
                    innerTextHtml += '<span class="status-cycle">Cycle Detected</span>';
                } else {
                    innerTextHtml += '<span class="status-depth">Depth: ' + hData.depth + '</span>';
                }
                headDiv.innerHTML = innerTextHtml;
                boxWrap.appendChild(headDiv);

                if (!hData.has_cycle) {
                    let preNode = document.createElement('div');
                    preNode.className = 'tree-view';
                    preNode.innerText = generateTreeString(hData.tree);
                    boxWrap.appendChild(preNode);
                }

                hList.appendChild(boxWrap);
            }
        } else {
            hList.innerHTML = '<p style="color: var(--text-muted);">No hierarchies.</p>';
        }

        cInvalids.innerText = apiResp.invalid_entries.length;
        populateList(invList, apiResp.invalid_entries);

        cDuplicates.innerText = apiResp.duplicate_edges.length;
        populateList(dupList, apiResp.duplicate_edges);

        jOut.innerText = JSON.stringify(apiResp, null, 2);
        outputSection.style.display = 'block';
    }
};
