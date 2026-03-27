console.log("ATS JS LOADED");

// =========================
// 📄 READ PDF + EXTRACT TEXT
// =========================
async function checkATS() {

  console.log("checkATS started");

  const file = document.getElementById("resumeFile").files[0];

  if (!file) {
    document.getElementById("errorMsg").innerText = "⚠ Upload resume first!";
    return;
  }

  document.getElementById("errorMsg").innerText = "";

  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "block";

  const reader = new FileReader();

  reader.onload = async function () {
    try {

      console.log("PDF loaded");

      const typedarray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument(typedarray).promise;

      let text = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        const strings = content.items.map(item => item.str);
        text += strings.join(" ");
      }

      const jobDesc = document.getElementById("jobDesc").value;

      await getAIScore(text, jobDesc);

    } catch (err) {
      console.error(err);
      if (loader) loader.style.display = "none";
    }
  };

  reader.readAsArrayBuffer(file);
}


// =========================
// 🤖 AI CALL + UI
// =========================
async function getAIScore(text, jobDesc) {
  try {

    console.log("getAIScore called");

    const res = await fetch("http://127.0.0.1:5000/ats-check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        resumeText: text,
        jobDesc: jobDesc
      })
    });

    const data = await res.json();

    console.log("API RESPONSE:", data);

    const loader = document.getElementById("loader");
    if (loader) loader.style.display = "none";

    const aiBox = document.getElementById("aiSuggestions");
    const suggestionBox = document.getElementById("suggestions");

    if (data && data.result) {

      let cleanText = data.result.replace(/\*\*/g, "");

      let scoreValue = 0;
      const match = cleanText.match(/\b\d{1,3}\b/);

      if (match) {
        scoreValue = parseInt(match[0]);

        document.getElementById("score").innerHTML =
          `<span style="font-size:28px; color:green; font-weight:bold;">
            ATS Score: ${scoreValue}/100
          </span>`;

        const progressBar = document.getElementById("progressBar");
        if (progressBar) {
          progressBar.style.width = scoreValue + "%";

          if (scoreValue < 50) progressBar.style.background = "red";
          else if (scoreValue < 75) progressBar.style.background = "orange";
          else progressBar.style.background = "green";
        }

      } else {
        document.getElementById("score").innerText = "ATS Score: Not found";
      }

      if (aiBox) {
        aiBox.innerHTML = cleanText.replace(/\n/g, "<br>");
      } else if (suggestionBox) {
        suggestionBox.innerHTML = cleanText.replace(/\n/g, "<br>");
      }

      if (typeof showToast === "function") {
        showToast("✅ ATS Analysis Completed!");
      }

    } else {
      if (aiBox) {
        aiBox.innerText = "⚠ AI response failed.";
      }
    }

  } catch (error) {
    console.error(error);

    const loader = document.getElementById("loader");
    if (loader) loader.style.display = "none";

    document.getElementById("errorMsg").innerText =
      "⚠ Server not running!";
  }
}
function downloadReport() {

  const scoreText = document.getElementById("score").innerText;

  const suggestions =
    document.getElementById("aiSuggestions")?.innerText ||
    document.getElementById("suggestions")?.innerText;

  const fullText = `
ATS Resume Report

${scoreText}

AI Suggestions:
${suggestions}
`;

  downloadPDF(fullText);
}
// =========================
// 📥 DOWNLOAD FUNCTION
// =========================
function downloadPDF(text) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("ATS Resume Analysis Report", 20, 20);

  doc.setFontSize(12);

  const lines = doc.splitTextToSize(text, 170);

  doc.text(lines, 20, 40);

  doc.save("ATS_Report.pdf");
}


// =========================
// ⬇ DOWNLOAD REPORT BUTTON
// =========================
function downloadReport() {

  const score = document.getElementById("score").innerText;

  const suggestions =
    document.getElementById("aiSuggestions")?.innerText ||
    document.getElementById("suggestions")?.innerText;

  const text = `
ATS Resume Analysis Report

${score}

----------------------------

AI Suggestions:
${suggestions}
`;

  downloadPDF(text);
}