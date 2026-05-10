import { type Issue } from "./mock-data"

/**
 * Convert an array of issues to CSV format and download it
 */
export function exportIssuesToCSV(issues: Issue[], filename: string = "issues-export.csv") {
  // Define CSV headers
  const headers = ["ID", "Title", "Application", "Status", "Category", "Severity", "Reporter", "Module", "Created At"]
  
  // Convert issues to CSV rows
  const rows = issues.map((issue) => [
    issue.id,
    `"${issue.title.replace(/"/g, '""')}"`, // Escape quotes in title
    issue.application,
    issue.status,
    issue.category,
    issue.severity,
    issue.reporter,
    issue.module,
    new Date(issue.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
  ])

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n")

  // Create a blob and download it
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export issues to a simple HTML table format (can be opened in Excel)
 */
export function exportIssuesToHTML(issues: Issue[], filename: string = "issues-export.xls") {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Issues Export</title>
  <style>
    body { font-family: Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; font-weight: bold; }
    tr:nth-child(even) { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h2>Issues Export - Generated ${new Date().toLocaleString()}</h2>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Title</th>
        <th>Application</th>
        <th>Status</th>
        <th>Category</th>
        <th>Severity</th>
        <th>Reporter</th>
        <th>Module</th>
        <th>Created At</th>
      </tr>
    </thead>
    <tbody>
      ${issues
        .map(
          (issue) => `
        <tr>
          <td>${issue.id}</td>
          <td>${issue.title}</td>
          <td>${issue.application}</td>
          <td>${issue.status}</td>
          <td>${issue.category}</td>
          <td>${issue.severity}</td>
          <td>${issue.reporter}</td>
          <td>${issue.module}</td>
          <td>${new Date(issue.createdAt).toLocaleDateString("en-US")}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>
  `

  const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
