"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
};

type UploadStatus = "idle" | "extracting" | "saving" | "complete" | "error";

const categoryMap: Record<string, string[]> = {
  "Programming": [
    "Python", "C", "C++", "JavaScript", "TypeScript", "Java",
    "Rust", "React", "Next.js", "Node.js", "Express.js", "FastAPI"
  ],
  "Databases": [
    "MySQL", "PostgreSQL", "MongoDB", "Neo4j", "Redis", "ChromaDB",
    "SQL", "Database Management"
  ],
  "AI / ML": [
    "Machine Learning", "Deep Learning", "Computer Vision",
    "Natural Language Processing", "PyTorch", "TensorFlow", "OpenCV"
  ],
  "Other Skills": [
    "Git", "Docker", "Kubernetes", "Wazuh", "Linux",
    "AWS", "Communication", "Problem Solving"
  ]
};

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store"
        });

        const data = await response.json();

        if (active && data.success && data.user) {
          setUser(data.user);
        }
      } catch (error) {
        console.error("Unable to load user:", error);
      } finally {
        if (active) setAuthChecked(true);
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  const userName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
    : "Student";

  const fileSize = (bytes: number) => {
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(bytes / 1024).toFixed(0)} KB`;
  };

  const chooseFile = (selected: File | null) => {
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setMessage("Please upload a PDF file.");
      setStatus("error");
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setMessage("File size must be 5 MB or less.");
      setStatus("error");
      return;
    }

    if (selected.size === 0) {
      setMessage("The selected file is empty.");
      setStatus("error");
      return;
    }

    setFile(selected);
    setSkills([]);
    setStatus("idle");
    setMessage("");
  };

  const extractPdfText = async (selectedFile: File): Promise<string> => {
    const pdfjs: any = await import("pdfjs-dist/build/pdf");

    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

    const buffer = await selectedFile.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;

    let fullText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item: any) => item.str || "")
        .join(" ");

      fullText += pageText + "\n";
    }

    if (!fullText.trim()) {
      throw new Error(
        "No readable text was found. This PDF may be scanned or image-based."
      );
    }

    return fullText;
  };

  const handleExtract = async () => {
    if (!file) {
      setMessage("Choose a resume before extracting skills.");
      setStatus("error");
      return;
    }

    if (!user) {
      setMessage("Please log in before uploading your resume.");
      setStatus("error");
      return;
    }

    try {
      setStatus("extracting");
      setMessage("Reading your resume and extracting skills...");

      const cvText = await extractPdfText(file);

      const extractResponse = await fetch("/api/extract-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvText,
          fileName: file.name
        })
      });

      const extractData = await extractResponse.json();

      if (!extractResponse.ok || !extractData.success) {
        throw new Error(
          extractData.error || "Unable to extract skills from your resume."
        );
      }

      const extractedSkills: string[] =
        extractData.extracted_skills || [];

      if (extractedSkills.length === 0) {
        throw new Error(
          "No recognized skills were found. Please check your resume."
        );
      }

      setSkills(extractedSkills);
      setStatus("saving");
      setMessage("Saving your resume and extracted skills...");

      const saveResponse = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fileName: file.name,
          extractedText: cvText,
          extractedSkills
        })
      });

      const saveData = await saveResponse.json();

      if (!saveResponse.ok || !saveData.success) {
        throw new Error(
          saveData.error || "Skills were extracted but resume saving failed."
        );
      }

      setStatus("complete");
      setMessage("Resume analyzed and saved successfully!");
    } catch (error: any) {
      console.error("Resume processing error:", error);
      setStatus("error");
      setMessage(error.message || "Something went wrong. Please try again.");
    }
  };

  const removeFile = () => {
    setFile(null);
    setSkills([]);
    setStatus("idle");
    setMessage("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const groupedSkills = Object.entries(categoryMap)
    .map(([category, categorySkills]) => ({
      category,
      skills: skills.filter((skill) =>
        categorySkills.some(
          (item) => item.toLowerCase() === skill.toLowerCase()
        )
      )
    }))
    .filter((group) => group.skills.length > 0);

  const ungroupedSkills = skills.filter(
    (skill) =>
      !Object.values(categoryMap).flat().some(
        (item) => item.toLowerCase() === skill.toLowerCase()
      )
  );

  const allGroups = [
    ...groupedSkills,
    ...(ungroupedSkills.length
      ? [{ category: "Additional Skills", skills: ungroupedSkills }]
      : [])
  ];

  return (
    <main className="upload-page">
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-icon">✥</span>
          <span>InternHub</span>
        </a>

        <nav className="nav-links">
          <a href="/">Home</a>
          <a href="/recommendations">Jobs</a>
          <a href="/companies">Companies</a>
          <a href="/stipend-insights">Stipend Insights</a>
          <a href="/about">About</a>
        </nav>

        <div className="profile-area">
          {authChecked && user ? (
            <>
              <button
                className="profile-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className="avatar">
                  {userName.charAt(0).toUpperCase()}
                </span>
                <span>Student</span>
                <span className="chevron">⌄</span>
              </button>

              {dropdownOpen && (
                <div className="profile-dropdown">
                  <strong>{userName}</strong>
                  <span>{user.email}</span>
                  <a href="/recommendations">My Jobs</a>
                  <a href="/profile">My Profile</a>
                </div>
              )}
            </>
          ) : (
            <a className="login-link" href="/login">
              Login
            </a>
          )}
        </div>
      </header>

      <div className="page-container">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              YOUR CAREER STARTS HERE
            </div>

            <h1>Upload Your Resume</h1>

            <p>
              Get personalized internship recommendations based on your
              skills.
            </p>
          </div>

          <div className="hero-illustration" aria-hidden="true">
            <div className="glow-orb orb-one" />
            <div className="glow-orb orb-two" />

            <div className="resume-art">
              <div className="resume-art-title">RESUME</div>
              <div className="resume-art-avatar">♙</div>
              <div className="resume-art-line long" />
              <div className="resume-art-line medium" />
              <div className="resume-art-line short" />
              <div className="resume-art-line medium" />
            </div>

            <div className="cloud-art">↑</div>
          </div>
        </section>

        <section className="steps">
          <div className="step active">
            <div className="step-circle">1</div>
            <span>Upload Resume</span>
          </div>

          <div className="step-line">
            <span />
          </div>

          <div className={`step ${status === "complete" ? "active" : ""}`}>
            <div className="step-circle">2</div>
            <span>Extract Skills</span>
          </div>

          <div className="step-line">
            <span />
          </div>

          <div className="step">
            <div className="step-circle">3</div>
            <span>View Recommendations</span>
          </div>
        </section>

        <section className="main-grid">
          <div className="left-column">
            <div
              className={`upload-card ${dragging ? "dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                chooseFile(event.dataTransfer.files[0] || null);
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                hidden
                onChange={(event) =>
                  chooseFile(event.target.files?.[0] || null)
                }
              />

              <div className="upload-icon">
                <svg viewBox="0 0 48 48" fill="none">
                  <path
                    d="M24 30V5m0 0L14 15M24 5l10 10M8 28v12h32V28"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h2>Drag and drop your resume here</h2>
              <p>or click to browse</p>
              <span className="upload-hint">
                Supports PDF files (Max 5MB)
              </span>

              <button
                className="primary-button choose-button"
                onClick={() => inputRef.current?.click()}
              >
                <span>▣</span> Choose File
              </button>
            </div>

            {file && (
              <div className="file-card">
                <div className="pdf-icon">
                  <span>PDF</span>
                </div>

                <div className="file-info">
                  <strong>{file.name}</strong>
                  <span>{fileSize(file.size)}</span>
                </div>

                <div className="file-status">
                  {status === "complete" ? (
                    <>
                      <span className="success-check">✓</span>
                      <span>Upload complete</span>
                    </>
                  ) : status === "extracting" || status === "saving" ? (
                    <>
                      <span className="spinner" />
                      <span>
                        {status === "extracting" ? "Analyzing..." : "Saving..."}
                      </span>
                    </>
                  ) : (
                    <span className="pending-label">Ready</span>
                  )}
                </div>

                <button
                  className="remove-button"
                  onClick={removeFile}
                  title="Remove file"
                  disabled={status === "extracting" || status === "saving"}
                >
                  ♧
                </button>
              </div>
            )}

            {message && (
              <div
                className={`message ${
                  status === "error" ? "error-message" :
                  status === "complete" ? "success-message" : ""
                }`}
              >
                {status === "complete" ? "✓" : status === "error" ? "!" : "◌"}
                <span>{message}</span>
              </div>
            )}

            <button
              className="primary-button extract-button"
              onClick={handleExtract}
              disabled={!file || status === "extracting" || status === "saving"}
            >
              {status === "extracting" || status === "saving" ? (
                <>
                  <span className="spinner" />
                  Processing Resume...
                </>
              ) : status === "complete" ? (
                <>✓ Resume Analyzed Successfully</>
              ) : (
                <>✦ Extract Skills from Resume <span>→</span></>
              )}
            </button>

            {status === "complete" && (
              <button
                className="continue-button"
                onClick={() => router.push("/recommendations")}
              >
                View Internship Recommendations →
              </button>
            )}
          </div>

          <aside className="right-column">
            <div className="info-card">
              <h3>How it Works?</h3>

              <div className="info-step">
                <div className="info-icon">▤</div>
                <div>
                  <strong>Upload Resume</strong>
                  <p>Add your latest resume (PDF).</p>
                </div>
              </div>

              <div className="info-connector">↓</div>

              <div className="info-step">
                <div className="info-icon">⚙</div>
                <div>
                  <strong>Extract Skills</strong>
                  <p>We analyze your resume and identify key skills, tools and domains.</p>
                </div>
              </div>

              <div className="info-connector">↓</div>

              <div className="info-step">
                <div className="info-icon">◎</div>
                <div>
                  <strong>Get Recommendations</strong>
                  <p>Receive internship matches tailored to your skills.</p>
                </div>
              </div>
            </div>

            <div className="info-card features-card">
              <h3>Supported Features</h3>

              <div className="feature-row">
                <span>✓</span> Automatic skill extraction
              </div>
              <div className="feature-row">
                <span>✓</span> Domain and role classification
              </div>
              <div className="feature-row">
                <span>✓</span> Personalized internship matching
              </div>
              <div className="feature-row">
                <span>✓</span> Match score with skill gap analysis
              </div>
            </div>
          </aside>
        </section>

        <section className="skills-card">
          <div className="skills-heading">
            <div>
              <h2>Extracted Skills Preview</h2>
              <p>
                {skills.length > 0
                  ? "Skills identified from your uploaded resume"
                  : "Your extracted skills will appear here after analysis"}
              </p>
            </div>

            <div className="skills-count">
              <strong>{skills.length}</strong>
              <span>Skills Found</span>
            </div>
          </div>

          {skills.length > 0 ? (
            <div className="skills-content">
              <div className="skills-ring">
                <div className="ring-inner">
                  <strong>{skills.length}</strong>
                  <span>Skills Found</span>
                </div>
              </div>

              <div className="skills-groups">
                {allGroups.map((group) => (
                  <div className="skill-group" key={group.category}>
                    <div className="group-title">
                      <span className="group-symbol">
                        {group.category === "Programming" ? "</>" :
                         group.category === "Databases" ? "▤" :
                         group.category === "AI / ML" ? "✺" : "★"}
                      </span>
                      <strong>{group.category}</strong>
                    </div>

                    <div className="skill-tags">
                      {group.skills.map((skill) => (
                        <span className="skill-tag" key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-skills">
              <div className="empty-icon">✧</div>
              <span>Upload and analyze your resume to see your skills here.</span>
            </div>
          )}
        </section>

        <footer className="page-footer">
          <span>✥ InternHub</span>
          <span>Find opportunities that match your skills.</span>
        </footer>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .upload-page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse at 80% 10%, rgba(91, 33, 182, .13), transparent 35%),
            radial-gradient(ellipse at 5% 60%, rgba(30, 64, 175, .10), transparent 35%),
            #050817;
          color: #f8fafc;
          font-family: Arial, Helvetica, sans-serif;
          overflow-x: hidden;
        }

        .topbar {
          height: 70px;
          padding: 0 5.5%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(168, 85, 247, .30);
          background: rgba(5, 8, 23, .92);
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(16px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: white;
          text-decoration: none;
          font-size: 23px;
          font-weight: 800;
          letter-spacing: -.7px;
        }

        .brand-icon {
          color: #c026ff;
          font-size: 35px;
          text-shadow: 0 0 18px #a855f7;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: clamp(18px, 3vw, 42px);
          height: 100%;
        }

        .nav-links a {
          color: #cbd5e1;
          text-decoration: none;
          font-size: 13px;
          height: 100%;
          display: flex;
          align-items: center;
          border-bottom: 2px solid transparent;
          transition: .2s;
        }

        .nav-links a:hover {
          color: #d8b4fe;
          border-color: #a855f7;
        }

        .profile-area {
          position: relative;
        }

        .profile-button {
          border: 0;
          background: transparent;
          color: white;
          display: flex;
          align-items: center;
          gap: 9px;
          cursor: pointer;
          font-size: 13px;
        }

        .avatar {
          height: 34px;
          width: 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: white;
          font-weight: bold;
          background: linear-gradient(135deg, #7c3aed, #0891b2);
          border: 2px solid #d8b4fe;
        }

        .chevron {
          color: #a78bfa;
          font-size: 19px;
        }

        .profile-dropdown {
          position: absolute;
          right: 0;
          top: 48px;
          width: 220px;
          padding: 16px;
          background: #11172b;
          border: 1px solid #6d28d9;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 15px 45px #0009;
        }

        .profile-dropdown strong {
          font-size: 14px;
        }

        .profile-dropdown span {
          color: #94a3b8;
          font-size: 11px;
          overflow-wrap: anywhere;
        }

        .profile-dropdown a, .login-link {
          color: #c4b5fd;
          text-decoration: none;
          font-size: 13px;
        }

        .page-container {
          max-width: 1440px;
          width: 91%;
          margin: 0 auto;
          padding: 45px 0 24px;
        }

        .hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          min-height: 125px;
          position: relative;
        }

        .hero-copy {
          position: relative;
          z-index: 2;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #c084fc;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 2px;
          margin-bottom: 12px;
        }

        .eyebrow-dot {
          width: 7px;
          height: 7px;
          background: #c026ff;
          border-radius: 50%;
          box-shadow: 0 0 12px #c026ff;
        }

        .hero h1 {
          font-size: clamp(30px, 3vw, 43px);
          margin: 0 0 10px;
          letter-spacing: -1.2px;
          font-weight: 800;
        }

        .hero-copy p {
          color: #b8c1d6;
          font-size: 15px;
          margin: 0;
        }

        .hero-illustration {
          position: relative;
          width: 270px;
          height: 155px;
          margin-right: 45px;
        }

        .resume-art {
          position: absolute;
          right: 42px;
          top: 2px;
          width: 125px;
          height: 130px;
          padding: 15px;
          border-radius: 13px;
          transform: rotate(10deg);
          background: linear-gradient(145deg, #302078, #111a45 75%);
          border: 1px solid #8b5cf6;
          box-shadow: 0 0 30px #7c3aed77, inset 0 0 20px #4c1d9555;
        }

        .resume-art-title {
          font-weight: 900;
          font-size: 16px;
          color: white;
          margin-bottom: 12px;
        }

        .resume-art-avatar {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          background: #2563eb;
          color: #bfdbfe;
          display: grid;
          place-items: center;
          margin-bottom: 9px;
        }

        .resume-art-line {
          height: 4px;
          border-radius: 5px;
          background: linear-gradient(90deg, #a78bfa, #38bdf8);
          margin: 7px 0;
        }

        .resume-art-line.long { width: 90%; }
        .resume-art-line.medium { width: 70%; }
        .resume-art-line.short { width: 48%; }

        .cloud-art {
          position: absolute;
          right: 0;
          bottom: 5px;
          width: 82px;
          height: 48px;
          border-radius: 22px 22px 18px 18px;
          display: grid;
          place-items: center;
          font-size: 35px;
          font-weight: bold;
          color: white;
          background: linear-gradient(135deg, #c026ff, #6d28d9);
          box-shadow: 0 0 28px #a855f799;
        }

        .glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(25px);
          opacity: .5;
        }

        .orb-one {
          width: 80px;
          height: 80px;
          background: #7c3aed;
          right: 100px;
          top: 25px;
        }

        .orb-two {
          width: 55px;
          height: 55px;
          background: #0891b2;
          right: 20px;
          top: 55px;
        }

        .steps {
          display: flex;
          align-items: center;
          justify-content: center;
          max-width: 650px;
          margin: 4px auto 38px;
        }

        .step {
          min-width: 115px;
          display: flex;
          align-items: center;
          flex-direction: column;
          gap: 8px;
          color: #94a3b8;
          font-size: 12px;
          white-space: nowrap;
        }

        .step.active {
          color: #f5eaff;
        }

        .step-circle {
          height: 36px;
          width: 36px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 15px;
          font-weight: 800;
          border: 2px solid #64748b;
          background: #111a30;
        }

        .step.active .step-circle {
          border-color: #d8b4fe;
          background: linear-gradient(135deg, #a855f7, #6d28d9);
          box-shadow: 0 0 18px #a855f799;
          color: white;
        }

        .step-line {
          flex: 1;
          height: 2px;
          background: #334155;
          margin: 0 -5px 25px;
          min-width: 45px;
        }

        .step-line span {
          display: block;
          height: 100%;
          width: 0;
          background: #a855f7;
        }

        .main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(280px, .95fr);
          gap: 18px;
          align-items: stretch;
        }

        .left-column, .right-column {
          min-width: 0;
        }

        .left-column {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 17px;
          border: 1px solid #263653;
          border-radius: 16px;
          background: linear-gradient(145deg, #0c1429, #0a1020);
        }

        .upload-card {
          min-height: 265px;
          flex: 1;
          border: 2px dashed #a78bfa;
          border-radius: 15px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 25px 15px;
          background:
            radial-gradient(ellipse at center, #4c1d951c, transparent 70%),
            #090f20;
          transition: .2s;
        }

        .upload-card.dragging {
          border-color: #e879f9;
          background: #581c8733;
          box-shadow: inset 0 0 30px #a855f733;
        }

        .upload-icon {
          width: 62px;
          height: 62px;
          display: grid;
          place-items: center;
          background: linear-gradient(145deg, #28245d, #121b3b);
          border: 1px solid #5142a0;
          border-radius: 13px;
          color: #e9d5ff;
          margin-bottom: 13px;
          box-shadow: 0 0 20px #7c3aed33;
        }

        .upload-icon svg {
          width: 35px;
          height: 35px;
        }

        .upload-card h2 {
          margin: 0 0 5px;
          font-size: 16px;
        }

        .upload-card p {
          margin: 0 0 10px;
          color: #cbd5e1;
          font-size: 14px;
        }

        .upload-hint {
          color: #aab6cd;
          font-size: 12px;
          margin-bottom: 17px;
        }

        .primary-button {
          border: 1px solid #c084fc;
          border-radius: 10px;
          background: linear-gradient(110deg, #9333ea, #6d28d9 55%, #7c3aed);
          color: white;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 5px 22px #7c3aed44;
          transition: transform .2s, box-shadow .2s;
        }

        .primary-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 7px 28px #a855f777;
        }

        .primary-button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .choose-button {
          min-width: 175px;
          padding: 12px 22px;
          font-size: 14px;
        }

        .choose-button span {
          margin-right: 7px;
          font-size: 17px;
        }

        .file-card {
          min-height: 62px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border: 1px solid #34466b;
          border-radius: 12px;
          background: #111c32;
        }

        .pdf-icon {
          width: 36px;
          height: 42px;
          border-radius: 7px;
          background: #f8fafc;
          display: grid;
          place-items: center;
          color: #dc2626;
          font-size: 10px;
          font-weight: 900;
        }

        .file-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .file-info strong {
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .file-info span {
          font-size: 11px;
          color: #94a3b8;
        }

        .file-status {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #4ade80;
          font-size: 12px;
          white-space: nowrap;
        }

        .success-check {
          font-size: 18px;
          font-weight: bold;
        }

        .pending-label {
          color: #c4b5fd;
        }

        .remove-button {
          background: transparent;
          color: #cbd5e1;
          border: 0;
          font-size: 20px;
          cursor: pointer;
          padding: 5px;
        }

        .remove-button:hover {
          color: #f87171;
        }

        .message {
          display: flex;
          gap: 9px;
          align-items: center;
          font-size: 12px;
          color: #c4b5fd;
          padding: 8px 11px;
          border-radius: 8px;
          background: #312e8133;
        }

        .error-message {
          color: #fca5a5;
          background: #7f1d1d33;
        }

        .success-message {
          color: #86efac;
          background: #14532d33;
        }

        .extract-button {
          min-height: 48px;
          width: min(100%, 390px);
          align-self: center;
          font-size: 14px;
          padding: 12px 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
        }

        .extract-button span {
          font-size: 18px;
        }

        .continue-button {
          border: 1px solid #a855f7;
          border-radius: 9px;
          background: #25134a;
          color: #e9d5ff;
          padding: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .right-column {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .info-card {
          padding: 17px;
          border: 1px solid #7134b7;
          border-radius: 15px;
          background:
            radial-gradient(ellipse at top left, #6d28d922, transparent 60%),
            #0d1428;
          box-shadow: inset 0 0 25px #7c3aed0c;
        }

        .info-card h3 {
          margin: 0 0 15px;
          padding-bottom: 11px;
          border-bottom: 1px solid #29334c;
          font-size: 17px;
        }

        .info-step {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .info-icon {
          flex: 0 0 39px;
          width: 39px;
          height: 39px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #9333ea, #4c1d95);
          border: 1px solid #c084fc;
          box-shadow: 0 0 15px #9333ea55;
          font-size: 20px;
        }

        .info-step strong {
          font-size: 13px;
        }

        .info-step p {
          margin: 4px 0 0;
          color: #cbd5e1;
          font-size: 11px;
          line-height: 1.5;
        }

        .info-connector {
          color: #a78bfa;
          font-size: 19px;
          margin: 1px 0 1px 12px;
          line-height: 1;
        }

        .features-card {
          flex: 1;
        }

        .feature-row {
          display: flex;
          gap: 9px;
          align-items: flex-start;
          color: #d5dceb;
          font-size: 11px;
          line-height: 1.5;
          margin: 11px 0;
        }

        .feature-row span {
          color: #4ade80;
          font-size: 16px;
          font-weight: bold;
        }

        .skills-card {
          margin-top: 17px;
          border: 1px solid #7134b7;
          border-radius: 15px;
          padding: 17px;
          background: linear-gradient(145deg, #10172c, #0b1020);
        }

        .skills-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px solid #29334c;
          padding-bottom: 13px;
        }

        .skills-heading h2 {
          font-size: 18px;
          margin: 0 0 5px;
        }

        .skills-heading p {
          font-size: 11px;
          color: #94a3b8;
          margin: 0;
        }

        .skills-count {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #c4b5fd;
        }

        .skills-count strong {
          font-size: 22px;
        }

        .skills-count span {
          font-size: 10px;
          color: #94a3b8;
        }

        .skills-content {
          display: flex;
          gap: 22px;
          align-items: center;
          padding: 17px 0 4px;
        }

        .skills-ring {
          flex: 0 0 140px;
          height: 140px;
          width: 140px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: conic-gradient(
            #c026ff 0deg,
            #7c3aed 230deg,
            #312e81 360deg
          );
          box-shadow: 0 0 25px #7c3aed44;
          position: relative;
        }

        .skills-ring::before {
          content: "";
          position: absolute;
          inset: 10px;
          background: #11172c;
          border-radius: 50%;
        }

        .ring-inner {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .ring-inner strong {
          font-size: 29px;
        }

        .ring-inner span {
          color: #cbd5e1;
          font-size: 11px;
        }

        .skills-groups {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }

        .skill-group {
          display: grid;
          grid-template-columns: minmax(125px, 160px) 1fr;
          align-items: center;
          gap: 10px;
        }

        .group-title {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 12px;
          color: #e2e8f0;
        }

        .group-symbol {
          color: #22d3ee;
          font-size: 18px;
          font-weight: 900;
        }

        .skill-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .skill-tag {
          padding: 6px 10px;
          border-radius: 9px;
          border: 1px solid #55409b;
          background: linear-gradient(135deg, #262052, #171d3c);
          color: #e9e4ff;
          font-size: 10px;
          white-space: nowrap;
        }

        .empty-skills {
          min-height: 135px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 10px;
          color: #64748b;
          font-size: 12px;
          text-align: center;
        }

        .empty-icon {
          color: #a855f7;
          font-size: 34px;
        }

        .page-footer {
          display: flex;
          justify-content: space-between;
          color: #64748b;
          font-size: 11px;
          padding: 22px 3px 0;
        }

        .page-footer span:first-child {
          color: #c084fc;
          font-weight: 800;
        }

        .spinner {
          width: 14px;
          height: 14px;
          display: inline-block;
          border: 2px solid #ffffff55;
          border-top-color: white;
          border-radius: 50%;
          animation: spin .7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 850px) {
          .topbar {
            padding: 0 4%;
          }

          .nav-links {
            gap: 15px;
          }

          .hero-illustration {
            margin-right: 0;
            transform: scale(.85);
            transform-origin: right center;
          }

          .main-grid {
            grid-template-columns: 1fr;
          }

          .right-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 600px) {
          .topbar {
            height: auto;
            min-height: 65px;
            flex-wrap: wrap;
            gap: 10px;
            padding: 10px 4%;
          }

          .brand {
            font-size: 19px;
          }

          .brand-icon {
            font-size: 28px;
          }

          .nav-links {
            order: 3;
            width: 100%;
            overflow-x: auto;
            height: 35px;
            gap: 22px;
          }

          .nav-links a {
            white-space: nowrap;
            font-size: 11px;
          }

          .profile-button {
            font-size: 11px;
          }

          .page-container {
            width: 92%;
            padding-top: 28px;
          }

          .hero {
            min-height: 120px;
          }

          .hero h1 {
            font-size: 29px;
          }

          .hero-copy p {
            max-width: 270px;
            font-size: 12px;
            line-height: 1.6;
          }

          .hero-illustration {
            position: absolute;
            right: -25px;
            top: 0;
            opacity: .35;
            transform: scale(.7);
          }

          .steps {
            margin: 15px auto 25px;
          }

          .step {
            min-width: 85px;
            font-size: 9px;
          }

          .step-circle {
            width: 31px;
            height: 31px;
          }

          .step-line {
            min-width: 15px;
          }

          .left-column {
            padding: 11px;
          }

          .upload-card {
            min-height: 240px;
          }

          .file-card {
            gap: 8px;
            padding: 9px;
          }

          .file-status {
            font-size: 10px;
          }

          .right-column {
            display: flex;
          }

          .skills-content {
            flex-direction: column;
          }

          .skills-ring {
            width: 115px;
            height: 115px;
            flex-basis: 115px;
          }

          .skill-group {
            grid-template-columns: 1fr;
            gap: 7px;
          }

          .page-footer {
            gap: 12px;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </main>
  );
}

