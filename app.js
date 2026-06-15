const ENDPOINT = "https://<YOUR_SANDBOX_DOMAIN>.sandbox.my.salesforce.com/services/data/v66.0/graphql";

// Your active Salesforce Session / Bearer Token
const AUTH_TOKEN = "PASTE_YOUR_SFDC_BEARER_TOKEN_HERE";

const PAGE_SIZE = 5;       
const pageCursors = { 1: null }; 
let currentPage = 1;       

const GET_CASES_QUERY = `
  query getCases($pageSize: Int!, $afterCursor: String) {
    uiapi {
      query {
        Case(
          first: $pageSize, 
          after: $afterCursor, 
          where: { Subject: { like: "Case -%" } } #Add your own logic here for filter
        ) {
          edges {
            node {
              CaseNumber { value }
              Subject { value }
              Status { value }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`;

/**
 * Helper function to output the right CSS badge classes based on Case Status text
 */
function getStatusBadgeHtml(statusText) {
    if (!statusText) return `<span class="status-badge status-default">N/A</span>`;
    
    const normalized = statusText.toLowerCase().trim();
    
    if (normalized === 'in progress') {
        return `<span class="status-badge status-in-progress">${statusText}</span>`;
    } else if (normalized === 'needs new owner') {
        return `<span class="status-badge status-new">${statusText}</span>`;
    } else if (normalized === 'closed' || normalized === 'resolved') {
        return `<span class="status-badge status-closed">${statusText}</span>`;
    } else {
        return `<span class="status-badge status-default">${statusText}</span>`;
    }
}

async function goToPage(targetPage) {
    const tableBody = document.getElementById("caseTableBody");
    tableBody.innerHTML = `<tr><td colspan="4">Loading Page ${targetPage}...</td></tr>`;
    
    try {
        let currentKnownPage = 1;
        while(pageCursors[currentKnownPage] !== undefined) {
            currentKnownPage++;
        }
        let lastKnownFilledPage = currentKnownPage - 1;

        while (lastKnownFilledPage < targetPage) {
            tableBody.innerHTML = `<tr><td colspan="4">Traversing background cursors to reach Page ${targetPage}... (At Page ${lastKnownFilledPage})</td></tr>`;
            
            const targetCursor = pageCursors[lastKnownFilledPage];
            const response = await fetch(ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${AUTH_TOKEN.trim()}`
                },
                body: JSON.stringify({
                    query: GET_CASES_QUERY,
                    variables: { pageSize: PAGE_SIZE, afterCursor: targetCursor }
                })
            });

            const result = await response.json();
            
            if (result.errors && result.errors.length > 0) {
                throw new Error(result.errors[0].message);
            }

            const data = result.data.uiapi.query.Case;
            if (data.pageInfo.hasNextPage) {
                pageCursors[lastKnownFilledPage + 1] = data.pageInfo.endCursor;
            } else if (lastKnownFilledPage + 1 < targetPage) {
                throw new Error(`Data ends early. Page ${targetPage} does not exist.`);
            }
            lastKnownFilledPage++;
        }

        const finalCursor = pageCursors[targetPage];
        const response = await fetch(ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${AUTH_TOKEN.trim()}`
            },
            body: JSON.stringify({
                query: GET_CASES_QUERY,
                variables: { pageSize: PAGE_SIZE, afterCursor: finalCursor }
            })
        });

        const result = await response.json();
        
        if (result.errors && result.errors.length > 0) {
            throw new Error(result.errors[0].message);
        }

        const pageData = result.data.uiapi.query.Case;
        const edges = pageData.edges;

        tableBody.innerHTML = "";
        if (edges.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4">No records found matching "Case -".</td></tr>`;
            return;
        }

        const startSerialNumber = ((targetPage - 1) * PAGE_SIZE) + 1;

        edges.forEach((edge, index) => {
            const node = edge.node;
            const rawStatus = node.Status?.value;
            const row = document.createElement("tr");
            
            row.innerHTML = `
                <td><b>${startSerialNumber + index}</b></td>
                <td>${node.CaseNumber?.value || 'N/A'}</td>
                <td>${node.Subject?.value || 'No Subject'}</td>
                <td>${getStatusBadgeHtml(rawStatus)}</td>
            `;
            tableBody.appendChild(row);
        });

        currentPage = targetPage;
        document.getElementById("pageSelect").value = currentPage;
        document.getElementById("prevBtn").disabled = (currentPage === 1);
        document.getElementById("nextBtn").disabled = !pageData.pageInfo.hasNextPage;

    } catch (error) {
        console.error("UI Render Exception:", error);
        tableBody.innerHTML = `<tr><td colspan="4" style="color: red; font-weight: bold; background-color: #fdf2e9; padding: 15px;">Error: ${error.message}</td></tr>`;
    }
}

document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentPage > 1) goToPage(currentPage - 1);
});

document.getElementById("nextBtn").addEventListener("click", () => {
    goToPage(currentPage + 1);
});

document.getElementById("pageSelect").addEventListener("change", (e) => {
    goToPage(parseInt(e.target.value));
});

goToPage(1);