'use client';
import StudentNavbar from "../../components/StudentNavbar";

import React, { useState, useEffect } from 'react';

export default function RecommendationsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [stipendStats, setStipendStats] = useState<any[]>([]);

  const [candidateName, setCandidateName] = useState('Student');
  const [candidateEmail, setCandidateEmail] = useState('');

  const [error, setError] = useState('');
  const [applyMsg, setApplyMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('high-low');
  const [typeFilter, setTypeFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [savedOpportunityIds, setSavedOpportunityIds] = useState<Array<string | number>>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any | null>(null);
  const [academicProfile, setAcademicProfile] = useState<any | null>(null);
  const [academicProfileLoaded, setAcademicProfileLoaded] = useState(false);
  const [academicReview, setAcademicReview] = useState<any | null>(null);
  const [academicReviewOpen, setAcademicReviewOpen] = useState(false);
  const [savingAcademicReview, setSavingAcademicReview] = useState(false);
  const [academicReviewMessage, setAcademicReviewMessage] = useState('');
  const [savedResume, setSavedResume] = useState<any | null>(null);
  const [showResumeUploader, setShowResumeUploader] = useState(false);
  const [resumeRestoreLoading, setResumeRestoreLoading] = useState(false);

  const pageSize = 8;

  const getMatchPercent = (opportunity: any): number | null => {
    const raw = opportunity?.match_score;

    if (raw === null || raw === undefined || raw === "") {
      return null;
    }

    const value = Number(raw);

    if (!Number.isFinite(value)) return null;

    return Math.max(
      0,
      Math.min(100, value <= 1 ? value * 100 : value)
    );
  };

  const filteredRecommendations = recommendations
    .filter((rec: any) => {
      const haystack = [
        rec.title,
        rec.company_name,
        rec.description,
        rec.location,
        rec.opportunity_type,
        rec.mode,
        ...normalizeSkillArray(rec.requiredSkills ?? rec.required_skills_list ?? rec.required_skills),
        ...normalizeSkillArray(rec.preferredSkills ?? rec.preferred_skills_list ?? rec.preferred_skills),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = haystack.includes(searchTerm.trim().toLowerCase());
      const type = String(rec.opportunity_type || rec.type || '').toLowerCase();
      const mode = String(rec.mode || rec.work_mode || '').toLowerCase();

      const matchesType = typeFilter === 'all' || type.includes(typeFilter);
      const matchesMode = modeFilter === 'all' || mode.includes(modeFilter);

      return matchesSearch && matchesType && matchesMode;
    })
    .sort((a: any, b: any) => {
      const scoreA = getMatchPercent(a);
      const scoreB = getMatchPercent(b);

      if (scoreA === null && scoreB === null) return 0;
      if (scoreA === null) return 1;
      if (scoreB === null) return -1;

      return sortOrder === "low-high"
        ? scoreA - scoreB
        : scoreB - scoreA;
    });

  const totalPages = Math.max(1, Math.ceil(filteredRecommendations.length / pageSize));

  const visibleRecommendations = filteredRecommendations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const validScores = recommendations
    .map(getMatchPercent)
    .filter((score): score is number => score !== null);

  const topMatchScore =
    validScores.length > 0
      ? Math.round(Math.max(...validScores))
      : null;

  const fetchApplicationsForCandidate = async (emailToFetch: string) => {
    if (!emailToFetch.trim()) {
      setMyApplications([]);
      return;
    }

    try {
      const res = await fetch(
        `/api/applications?email=${encodeURIComponent(emailToFetch.trim())}`
      );

      const data = await res.json();

      if (data.success) {
        setMyApplications(data.applications || []);
        setStipendStats(data.stipend_analytics || []);
      }
    } catch (err) {
      console.error('Error fetching candidate applications:', err);
    }
  };

  useEffect(() => {
    let active = true;

    async function loadAuthenticatedStudent() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });

        const data = await response.json();

        if (!response.ok || !data.success || !data.user) {
          if (active) {
            setError('Please log in to access your student account.');
          }
          return;
        }

        if (active) {
          const user = data.user;
          const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();

          setCandidateName(fullName || 'Student');
          setCandidateEmail(user.email || '');
        }
      } catch (error) {
        console.error('Unable to load authenticated student:', error);
        if (active) {
          setError('Unable to load your student account. Please refresh.');
        }
      }
    }

    loadAuthenticatedStudent();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (candidateEmail) {
      fetchApplicationsForCandidate(candidateEmail);
    }
  }, [candidateEmail]);

  useEffect(() => {
    let active = true;
    const loadAcademicProfile = async () => {
      try {
        const response = await fetch('/api/academics', {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          if (active) setAcademicProfile(null);
          return;
        }
        const profile = data.academics || data.profile || data.student || data;
        if (active) setAcademicProfile(profile);
      } catch (err) {
        console.error('Unable to load academic profile:', err);
        if (active) setAcademicProfile(null);
      } finally {
        if (active) setAcademicProfileLoaded(true);
      }
    };
    loadAcademicProfile();
    return () => { active = false; };
  }, []);

  // Restore the latest active resume, extracted skills and recommendations
  // from MySQL. Students only need to upload again when replacing their resume.
  useEffect(() => {
    if (!candidateEmail) return;

    let active = true;
    const restoreSavedResume = async () => {
      setResumeRestoreLoading(true);
      try {
        const response = await fetch('/api/resumes', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          if (response.status !== 404) {
            throw new Error(data.message || data.error || 'Unable to restore your saved resume.');
          }
          return;
        }

        const resume = data.resume;
        if (!resume || !resume.extractedText) return;

        if (!active) return;
        setSavedResume({
          resumeId: resume.resumeId,
          fileName: resume.fileName,
          uploadedAt: resume.uploadedAt,
        });
        setExtractedSkills(Array.isArray(resume.extractedSkills) ? resume.extractedSkills : []);

        let restoredRecommendations = Array.isArray(resume.recommendations)
          ? resume.recommendations
          : [];
        let pendingAcademic = resume.academicExtraction || null;

        // Older resume records may not have cached recommendations yet.
        // Generate them once from the stored text, then cache them in MySQL.
        if (!resume.recommendationsCached) {
          const extractResponse = await fetch('/api/extract-cv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              cvText: resume.extractedText,
              fileName: resume.fileName,
            }),
          });
          const extracted = await extractResponse.json();
          if (!extractResponse.ok || !extracted.success) {
            throw new Error(extracted.error || 'Unable to rebuild recommendations from your saved resume.');
          }

          restoredRecommendations = Array.isArray(extracted.recommendations) ? extracted.recommendations : [];
          pendingAcademic = extracted.academic_profile || pendingAcademic;

          await fetch('/api/resumes', {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recommendations: restoredRecommendations,
              academicExtraction: pendingAcademic,
            }),
          });
          if (active) setExtractedSkills(extracted.extracted_skills || resume.extractedSkills || []);
        }

        if (!active) return;
        setRecommendations(restoredRecommendations);
        setCurrentPage(1);

        if (pendingAcademic && typeof pendingAcademic === 'object') {
          setAcademicReview({
            degree: pendingAcademic.degree ?? '',
            major: pendingAcademic.major ?? '',
            college: pendingAcademic.college ?? '',
            graduation_year: pendingAcademic.graduation_year ?? '',
            cgpa: pendingAcademic.cgpa ?? '',
            tenth_percentage: pendingAcademic.tenth_percentage ?? '',
            twelfth_percentage: pendingAcademic.twelfth_percentage ?? '',
            diploma_percentage: pendingAcademic.diploma_percentage ?? '',
            active_backlogs: pendingAcademic.active_backlogs ?? '',
            current_semester: pendingAcademic.current_semester ?? '',
            confidence: pendingAcademic.confidence || {},
            evidence: pendingAcademic.evidence || {},
          });
          setAcademicReviewOpen(true);
        }
      } catch (err: any) {
        console.error('Saved resume restoration error:', err);
        if (active) setError(err.message || 'Unable to restore your saved resume.');
      } finally {
        if (active) setResumeRestoreLoading(false);
      }
    };

    restoreSavedResume();
    return () => { active = false; };
  }, [candidateEmail]);

  const handleScanAndRecommend = async () => {
    if (!file) {
      setError('Please select a CV file first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let cvText = '';

      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const pdfjsLib = await import('pdfjs-dist/build/pdf');

        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

        const arrayBuffer = await file.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
        }).promise;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();

          cvText +=
            textContent.items
              .map((item: any) => ('str' in item ? item.str : ''))
              .join(' ') + '\n';
        }
      } else {
        cvText = await file.text();
      }

      if (!cvText.trim()) {
        throw new Error('No readable text found in the uploaded resume.');
      }

      const extractRes = await fetch('/api/extract-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText,
          fileName: file.name,
        }),
      });

      const extractData = await extractRes.json();

      if (!extractRes.ok || !extractData.success) {
        throw new Error(extractData.error || 'Skill extraction failed.');
      }

      const skills = extractData.extracted_skills || [];

      setExtractedSkills(skills);
      const extractedAcademic = extractData.academic_profile || {};
      setAcademicReview({
        degree: extractedAcademic.degree ?? '',
        major: extractedAcademic.major ?? '',
        college: extractedAcademic.college ?? '',
        graduation_year: extractedAcademic.graduation_year ?? '',
        cgpa: extractedAcademic.cgpa ?? '',
        tenth_percentage: extractedAcademic.tenth_percentage ?? '',
        twelfth_percentage: extractedAcademic.twelfth_percentage ?? '',
        diploma_percentage: extractedAcademic.diploma_percentage ?? '',
        active_backlogs: extractedAcademic.active_backlogs ?? '',
        current_semester: extractedAcademic.current_semester ?? '',
        confidence: extractedAcademic.confidence || {},
        evidence: extractedAcademic.evidence || {},
      });
      setAcademicReviewMessage('');

      const saveRes = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileName: file.name,
          extractedText: cvText,
          extractedSkills: skills,
          recommendations: extractData.recommendations || [],
          academicExtraction: extractedAcademic,
        }),
      });

      const saveData = await saveRes.json();

      if (!saveRes.ok || !saveData.success) {
        throw new Error(saveData.error || 'Could not save your resume.');
      }

      // Recommendations are already generated by /api/extract-cv.
      // Do not call /api/opportunities here: its POST handler creates jobs.
      setRecommendations(extractData.recommendations || []);
      setSavedResume({ fileName: file.name, uploadedAt: new Date().toISOString() });
      setFile(null);
      setShowResumeUploader(false);
      setCurrentPage(1);
      setAcademicReviewOpen(true);
    } catch (err: any) {
      console.error('Resume processing error:', err);
      setError(err.message || 'Something went wrong while processing your resume.');
    } finally {
      setLoading(false);
    }
  };

  const updateAcademicReviewField = (key: string, value: string) => {
    setAcademicReview((current: any) => ({ ...current, [key]: value }));
  };

  const confirmAcademicReview = async () => {
    if (!academicReview) return;
    setSavingAcademicReview(true);
    setAcademicReviewMessage('');

    try {
      const response = await fetch('/api/academics', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          degree: String(academicReview.degree || '').trim() || null,
          major: String(academicReview.major || '').trim() || null,
          graduation_year: academicReview.graduation_year === '' ? null : Number(academicReview.graduation_year),
          cgpa: academicReview.cgpa === '' ? null : Number(academicReview.cgpa),
          tenth_percentage: academicReview.tenth_percentage === '' ? null : Number(academicReview.tenth_percentage),
          twelfth_percentage: academicReview.twelfth_percentage === '' ? null : Number(academicReview.twelfth_percentage),
          diploma_percentage: academicReview.diploma_percentage === '' ? null : Number(academicReview.diploma_percentage),
          active_backlogs: academicReview.active_backlogs === '' ? null : Number(academicReview.active_backlogs),
          current_semester: academicReview.current_semester === '' ? null : Number(academicReview.current_semester),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Unable to save academic profile.');
      }
      setAcademicProfile(data.academicProfile || academicReview);
      // Clear the pending suggestion so it is not shown again after refresh.
      await fetch('/api/resumes', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicExtraction: null }),
      });
      setAcademicReview(null);
      setAcademicReviewMessage('Academic profile saved successfully.');
      setAcademicReviewOpen(false);
    } catch (err: any) {
      setAcademicReviewMessage(err?.message || 'Unable to save academic profile.');
    } finally {
      setSavingAcademicReview(false);
    }
  };

  const skipAcademicReview = () => {
    setAcademicReviewOpen(false);
    setAcademicReviewMessage('Academic details were not saved. You can update them later from your profile.');
  };

  const handleApply = async (opportunity: any) => {
    setApplyMsg('');

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          opportunity_id: opportunity.opportunity_id,
          candidate_email: candidateEmail,
          extracted_skills: extractedSkills,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Application could not be submitted.');
      }

      setApplyMsg('Application submitted successfully!');
      fetchApplicationsForCandidate(candidateEmail);
    } catch (err: any) {
      setApplyMsg(err.message || 'Unable to submit application.');
    }
  };

  const toggleSavedOpportunity = (id: string | number) => {
    setSavedOpportunityIds((current) =>
      current.includes(id)
        ? current.filter((savedId) => savedId !== id)
        : [...current, id]
    );
  };

  const skillCategories = [
    {
      name: 'Programming',
      icon: '⌘',
      skills: ['Python', 'Java', 'C', 'C++', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js'],
    },
    {
      name: 'Databases',
      icon: '▤',
      skills: ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Neo4j', 'SQL', 'ChromaDB'],
    },
    {
      name: 'AI / ML',
      icon: '✿',
      skills: ['Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'OpenCV', 'Data Analysis', 'Natural Language Processing'],
    },
    {
      name: 'Other Skills',
      icon: '★',
      skills: ['Git', 'Docker', 'Kubernetes', 'Linux', 'AWS', 'Communication'],
    },
  ];

  const groupedSkills = skillCategories
    .map((category) => ({
      ...category,
      skills: extractedSkills.filter((skill) =>
        category.skills.some(
          (knownSkill) => knownSkill.toLowerCase() === skill.toLowerCase()
        )
      ),
    }))
    .filter((category) => category.skills.length > 0);

  const unmatchedSkills = extractedSkills.filter(
    (skill) =>
      !skillCategories.some((category) =>
        category.skills.some(
          (knownSkill) => knownSkill.toLowerCase() === skill.toLowerCase()
        )
      )
  );

  const getOpportunityId = (opportunity: any) =>
    opportunity.opportunity_id ?? opportunity.id;

  function normalizeSkillArray(value: any): string[] {
    let skills: string[] = [];

    if (Array.isArray(value)) {
      skills = value;
    } else if (typeof value === "string" && value.trim()) {
      skills = value.split(/[,;|\n]+/);
    }

    return [...new Set(
      skills
        .map((skill) => String(skill).trim())
        .filter(Boolean)
    )];
  }

  const getSkillList = (opportunity: any): string[] => {
    const candidates = [
      opportunity?.requiredSkills,
      opportunity?.required_skills_list,
      opportunity?.required_skills,
      opportunity?.skills,
    ];
    for (const candidate of candidates) {
      const parsed = normalizeSkillArray(candidate);
      if (parsed.length > 0) return parsed;
    }
    return [];
  };

  const getPreferredSkillList = (opportunity: any): string[] => {
    const candidates = [
      opportunity?.preferredSkills,
      opportunity?.preferred_skills_list,
      opportunity?.preferred_skills,
    ];
    for (const candidate of candidates) {
      const parsed = normalizeSkillArray(candidate);
      if (parsed.length > 0) return parsed;
    }
    return [];
  };

  const getCompanyInitial = (name: string) =>
    (name || "C").trim().charAt(0).toUpperCase();

  const getMatchColor = (score: number | null) =>
    score === null
      ? "#64748b"
      : score >= 85
        ? "#16d98a"
        : score >= 70
          ? "#f5c542"
          : "#ff9b54";

  const getOpportunityStipend = (opportunity: any) =>
    opportunity?.stipend ?? opportunity?.stipend_amount ?? null;

  const getOpportunityDuration = (opportunity: any) =>
    opportunity?.duration ?? opportunity?.duration_months ?? null;

  const getOpportunityMode = (opportunity: any) =>
    opportunity?.mode ?? opportunity?.work_mode ?? null;

  const getOpportunityType = (opportunity: any) =>
    opportunity?.opportunity_type ?? opportunity?.type ?? "Internship";

  const getBreakdown = (opportunity: any) => {
    const breakdown = opportunity?.score_breakdown;

    return {
      requiredMatched: Number(breakdown?.required_matched ?? 0),
      requiredTotal: Number(breakdown?.required_total ?? 0),
      preferredMatched: Number(breakdown?.preferred_matched ?? 0),
      preferredTotal: Number(breakdown?.preferred_total ?? 0),
    };
  };

  const parseEligibilityList = (value: any): string[] => {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
      } catch {
        return value.split(/[,;|\n]+/).map((item) => item.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const evaluateAcademicEligibility = (opportunity: any) => {
    const criteria = opportunity?.eligibility || opportunity?.academic_eligibility || opportunity;
    const configured = [
      'min_cgpa', 'min_tenth_percentage', 'min_twelfth_percentage',
      'min_diploma_percentage', 'max_active_backlogs', 'min_semester',
      'max_semester', 'eligible_degrees', 'eligible_branches',
      'eligible_graduation_years', 'other_requirements',
    ].some((key) => {
      const value = criteria?.[key];
      return value !== null && value !== undefined && value !== '' &&
        (!(Array.isArray(value)) || value.length > 0);
    });

    if (!configured) return { status: 'NO_RESTRICTIONS', label: 'No academic restrictions', reasons: [] as string[] };
    if (!academicProfileLoaded) return { status: 'CHECKING', label: 'Checking profile…', reasons: [] as string[] };
    if (!academicProfile) return { status: 'NEEDS_VERIFICATION', label: 'Needs verification', reasons: ['Academic profile could not be loaded.'] };

    const failed: string[] = [];
    const missing: string[] = [];
    const compareNumber = (field: string, requirement: any, label: string, mode: 'min' | 'max' = 'min') => {
      if (requirement === null || requirement === undefined || requirement === '') return;
      const actual = academicProfile[field];
      if (actual === null || actual === undefined || actual === '') { missing.push(`${label} is missing from your academic profile.`); return; }
      const a = Number(actual), r = Number(requirement);
      if (!Number.isFinite(a) || !Number.isFinite(r)) { missing.push(`${label} needs verification.`); return; }
      if (mode === 'min' ? a < r : a > r) failed.push(`${label}: your value is ${a}, requirement is ${mode === 'min' ? `at least ${r}` : `at most ${r}`}.`);
    };

    compareNumber('cgpa', criteria.min_cgpa, 'CGPA');
    compareNumber('tenth_percentage', criteria.min_tenth_percentage, '10th percentage');
    compareNumber('twelfth_percentage', criteria.min_twelfth_percentage, '12th percentage');
    compareNumber('diploma_percentage', criteria.min_diploma_percentage, 'Diploma percentage');
    compareNumber('active_backlogs', criteria.max_active_backlogs, 'Active backlogs', 'max');
    compareNumber('current_semester', criteria.min_semester, 'Current semester');
    compareNumber('current_semester', criteria.max_semester, 'Current semester', 'max');

    const compareList = (actualValue: any, allowedValue: any, label: string) => {
      const allowed = parseEligibilityList(allowedValue);
      if (!allowed.length) return;
      if (actualValue === null || actualValue === undefined || String(actualValue).trim() === '') {
        missing.push(`${label} is missing from your academic profile.`); return;
      }
      if (!allowed.some((item) => item.toLowerCase() === String(actualValue).trim().toLowerCase())) {
        failed.push(`${label}: ${String(actualValue)} is not in the accepted list (${allowed.join(', ')}).`);
      }
    };

    compareList(academicProfile.degree, criteria.eligible_degrees, 'Degree');
    compareList(academicProfile.major || academicProfile.branch, criteria.eligible_branches, 'Branch');

    const years = parseEligibilityList(criteria.eligible_graduation_years).map(Number);
    if (years.length) {
      const year = Number(academicProfile.graduation_year);
      if (!academicProfile.graduation_year) missing.push('Graduation year is missing from your profile.');
      else if (!years.includes(year)) failed.push(`Graduation year ${year} is not accepted. Accepted years: ${years.join(', ')}.`);
    }

    if (failed.length) return { status: 'NOT_ELIGIBLE', label: 'Not eligible', reasons: [...failed, ...missing] };
    if (missing.length) return { status: 'NEEDS_VERIFICATION', label: 'Needs verification', reasons: missing };
    return { status: 'ELIGIBLE', label: 'Eligible', reasons: ['Your available academic details meet the configured criteria.'] };
  };

  const totalSkillsMatched = extractedSkills.length;
    return (
    <main className="internhub-page">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #050817;
          color: #f8f9ff;
          font-family: Arial, Helvetica, sans-serif;
        }

        .internhub-page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse at 75% 5%, rgba(104, 26, 220, 0.18), transparent 35%),
            radial-gradient(ellipse at 5% 35%, rgba(43, 66, 165, 0.10), transparent 35%),
            #050817;
          color: #f8f9ff;
          padding-bottom: 60px;
        }

        .ih-navbar {
          height: 72px;
          padding: 0 5%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(151, 75, 255, 0.35);
          background: rgba(5, 8, 23, 0.94);
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(16px);
        }

        .ih-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          font-size: 25px;
          font-weight: 800;
          text-decoration: none;
          letter-spacing: -0.7px;
        }

        .ih-brand-icon {
          width: 36px;
          height: 36px;
          border: 2px solid #bd35ff;
          color: #d43cff;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 25px;
          box-shadow: 0 0 18px rgba(190, 44, 255, 0.4);
        }

        .ih-navlinks {
          display: flex;
          align-items: center;
          gap: 30px;
          height: 100%;
        }

        .ih-navlinks a {
          height: 100%;
          display: flex;
          align-items: center;
          color: #c5c9dc;
          text-decoration: none;
          font-size: 14px;
          position: relative;
          transition: color 0.2s;
        }

        .ih-navlinks a:hover,
        .ih-navlinks a.active {
          color: white;
        }

        .ih-navlinks a.active::after {
          content: "";
          height: 3px;
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: #c32cff;
          box-shadow: 0 0 12px #c32cff;
        }

        .ih-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #e9e9f4;
        }

        .ih-avatar {
          height: 36px;
          width: 36px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: linear-gradient(135deg, #8a36ff, #1e9be9);
          border: 2px solid #c45aff;
          font-weight: 700;
        }

        .ih-container {
          width: min(1240px, 92%);
          margin: 0 auto;
        }

        .ih-hero {
          min-height: 235px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          padding: 32px 0 20px;
        }

        .ih-hero-copy {
          position: relative;
          z-index: 2;
          max-width: 690px;
        }

        .ih-eyebrow {
          color: #d45aff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .ih-hero h1 {
          margin: 0 0 14px;
          font-size: clamp(32px, 4vw, 45px);
          line-height: 1.1;
          letter-spacing: -1.5px;
        }

        .ih-hero p {
          margin: 0;
          color: #c7cbe0;
          font-size: 16px;
          line-height: 1.6;
        }

        .ih-hero-art {
          width: 270px;
          height: 190px;
          object-fit: contain;
          filter: drop-shadow(0 0 25px rgba(145, 30, 255, 0.45));
          position: relative;
          z-index: 1;
        }

        .ih-progress {
          display: flex;
          align-items: center;
          justify-content: center;
          max-width: 760px;
          margin: 0 auto 32px;
        }

        .ih-progress-step {
          min-width: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          color: #c6c9dd;
        }

        .ih-progress-number {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          border: 2px solid #777da6;
          background: #11182e;
          font-size: 16px;
        }

        .ih-progress-step.active .ih-progress-number,
        .ih-progress-step.done .ih-progress-number {
          background: linear-gradient(135deg, #a82cff, #7023ed);
          border-color: #e1aaff;
          box-shadow: 0 0 18px rgba(171, 45, 255, 0.65);
          color: white;
        }

        .ih-progress-line {
          height: 2px;
          flex: 1;
          max-width: 150px;
          background: linear-gradient(90deg, #9a34ff, #3c4268);
          margin: 0 12px;
          transform: translateY(-13px);
        }

        .ih-upload-grid {
          display: grid;
          grid-template-columns: 1.65fr 1fr;
          gap: 18px;
          align-items: stretch;
        }

        .ih-panel {
          background: linear-gradient(145deg, rgba(15, 24, 48, 0.96), rgba(9, 15, 32, 0.98));
          border: 1px solid rgba(91, 110, 164, 0.45);
          border-radius: 17px;
          padding: 20px;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.18);
        }

        .ih-upload-panel {
          min-height: 390px;
        }

        .ih-dropzone {
          min-height: 230px;
          border: 2px dashed #bd4cff;
          border-radius: 15px;
          background: rgba(92, 32, 146, 0.10);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 25px;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .ih-dropzone:hover,
        .ih-dropzone.dragging {
          background: rgba(124, 45, 201, 0.2);
          border-color: #e17aff;
          box-shadow: inset 0 0 25px rgba(168, 46, 255, 0.12);
        }

        .ih-upload-icon {
          width: 62px;
          height: 62px;
          border-radius: 15px;
          background: linear-gradient(145deg, #29235b, #111c42);
          border: 1px solid #7049c9;
          display: grid;
          place-items: center;
          font-size: 32px;
          margin-bottom: 17px;
          color: #e2c9ff;
        }

        .ih-dropzone strong {
          font-size: 17px;
          margin-bottom: 8px;
        }

        .ih-dropzone span {
          color: #c4c9df;
          font-size: 13px;
        }

        .ih-file-input {
          display: none;
        }

        .ih-primary-button {
          border: 1px solid #c85aff;
          border-radius: 11px;
          color: white;
          background: linear-gradient(110deg, #a51eff, #7129e9);
          padding: 13px 24px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 5px 20px rgba(151, 37, 255, 0.3);
          transition: 0.2s ease;
        }

        .ih-primary-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(151, 37, 255, 0.48);
        }

        .ih-primary-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .ih-file-row {
          margin-top: 16px;
          padding: 13px 15px;
          min-height: 62px;
          border: 1px solid #35466e;
          border-radius: 12px;
          background: #101a32;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .ih-file-info {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .ih-pdf-icon {
          height: 40px;
          width: 35px;
          border-radius: 7px;
          background: white;
          color: #e52d45;
          display: grid;
          place-items: center;
          font-weight: 900;
          font-size: 11px;
          flex-shrink: 0;
        }

        .ih-file-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 700;
        }

        .ih-file-size {
          font-size: 11px;
          color: #9ca9c7;
          margin-top: 5px;
        }

        .ih-remove-file {
          color: #c5cbe0;
          border: 0;
          background: transparent;
          font-size: 20px;
          cursor: pointer;
        }

        .ih-extract-wrap {
          display: flex;
          justify-content: center;
          margin-top: 16px;
        }

        .ih-extract-button {
          min-width: min(390px, 100%);
          font-size: 15px;
          padding: 15px 20px;
        }

        .ih-error {
          color: #ff8b9b;
          background: rgba(180, 35, 65, 0.12);
          border: 1px solid rgba(255, 90, 120, 0.35);
          border-radius: 9px;
          padding: 11px 13px;
          margin-top: 12px;
          font-size: 13px;
        }

        .ih-success {
          color: #39e99c;
          font-size: 12px;
        }

        .ih-side-column {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .ih-side-card {
          border-color: rgba(164, 59, 255, 0.75);
          padding: 19px;
        }

        .ih-side-card h3 {
          margin: 0 0 16px;
          font-size: 17px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(116, 128, 173, 0.25);
        }

        .ih-how-item {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          margin: 13px 0;
        }

        .ih-how-icon {
          height: 39px;
          width: 39px;
          flex-shrink: 0;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: linear-gradient(145deg, #9c29ed, #4c23ad);
          border: 1px solid #c17aff;
          box-shadow: 0 0 13px rgba(156, 41, 237, 0.3);
          font-size: 18px;
        }

        .ih-how-item strong {
          display: block;
          font-size: 13px;
          margin: 2px 0 5px;
        }

        .ih-how-item p {
          margin: 0;
          color: #b7bfd8;
          font-size: 11px;
          line-height: 1.5;
        }

        .ih-feature-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 12px;
        }

        .ih-feature-list li {
          font-size: 12px;
          color: #d8dced;
        }

        .ih-feature-list li::before {
          content: "✓";
          color: #20e88c;
          font-size: 16px;
          font-weight: 900;
          margin-right: 10px;
        }

        .ih-section {
          margin-top: 20px;
          padding: 20px;
          border: 1px solid rgba(158, 59, 255, 0.7);
          border-radius: 17px;
          background: linear-gradient(145deg, rgba(14, 22, 44, 0.98), rgba(7, 13, 29, 0.98));
        }

        .ih-section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(111, 126, 170, 0.25);
          padding-bottom: 13px;
          margin-bottom: 16px;
        }

        .ih-section-heading h2 {
          margin: 0;
          font-size: 20px;
        }

        .ih-muted {
          color: #aeb9d4;
          font-size: 12px;
        }

        .ih-skill-count {
          color: #c79aff;
          font-size: 26px;
          font-weight: 800;
          text-align: right;
        }

        .ih-skill-layout {
          display: grid;
          grid-template-columns: 145px 1fr;
          gap: 22px;
          align-items: center;
        }

        .ih-skill-ring {
          height: 125px;
          width: 125px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: conic-gradient(#bd25ff 0deg, #6d31ee 260deg, #39236f 360deg);
          padding: 9px;
          box-shadow: 0 0 25px rgba(147, 42, 255, 0.2);
        }

        .ih-skill-ring-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: #0c142a;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .ih-skill-ring-inner strong {
          font-size: 26px;
        }

        .ih-skill-ring-inner span {
          color: #c2c9dc;
          font-size: 10px;
          margin-top: 3px;
        }

        .ih-skill-groups {
          display: grid;
          gap: 13px;
        }

        .ih-skill-group {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 12px;
          align-items: center;
        }

        .ih-skill-category {
          color: #e5e9f7;
          font-size: 12px;
          font-weight: 700;
        }

        .ih-skill-category span {
          color: #22d7ed;
          margin-right: 8px;
          font-size: 16px;
        }

        .ih-skill-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .ih-skill-chip {
          padding: 6px 10px;
          border: 1px solid #51428f;
          border-radius: 8px;
          background: rgba(76, 54, 145, 0.28);
          color: #e4e5fa;
          font-size: 11px;
        }

        @media (max-width: 850px) {
          .ih-upload-grid {
            grid-template-columns: 1fr;
          }

          .ih-hero-art {
            width: 210px;
          }

          .ih-navlinks {
            gap: 15px;
          }
        }

        @media (max-width: 600px) {
          .ih-navbar {
            padding: 0 4%;
          }

          .ih-brand {
            font-size: 19px;
          }

          .ih-navlinks {
            display: none;
          }

          .ih-hero {
            min-height: auto;
            padding: 35px 0 25px;
          }

          .ih-hero-art {
            display: none;
          }

          .ih-progress-step {
            min-width: 85px;
            font-size: 10px;
          }

          .ih-progress-line {
            margin: 0 4px;
          }

          .ih-skill-layout {
            grid-template-columns: 1fr;
            justify-items: center;
          }

          .ih-skill-group {
            grid-template-columns: 1fr;
            gap: 7px;
          }

          .ih-section-heading h2 {
            font-size: 17px;
          }
        }
      

          /* FULL JOB DETAILS VIEW */

          .ih-job-detail-overlay {
            position: fixed;
            inset: 0;
            z-index: 1000;
            overflow-y: auto;
            background: #050a17;
            padding: 20px;
          }

          .ih-job-detail-page {
            width: 100%;
            max-width: 1520px;
            min-height: calc(100vh - 40px);
            margin: 0 auto;
            padding: 25px 30px 35px;
            border: 2px solid #b832ff;
            border-radius: 22px;
            background:
              radial-gradient(ellipse at 75% 5%, rgba(91, 25, 173, 0.13), transparent 35%),
              linear-gradient(145deg, #071326, #050b18 65%, #080b20);
            box-shadow:
              0 0 15px rgba(191, 45, 255, 0.4),
              inset 0 0 25px rgba(127, 42, 255, 0.05);
            color: #f6f7ff;
          }

          .ih-back-jobs {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            margin: 0 0 25px;
            padding: 0;
            border: 0;
            background: transparent;
            color: #f5f5ff;
            font-size: 17px;
            font-weight: 800;
            cursor: pointer;
          }

          .ih-back-jobs:hover {
            color: #d45aff;
          }

          .ih-job-header {
            display: grid;
            grid-template-columns: 125px minmax(0, 1fr) 280px;
            align-items: center;
            gap: 25px;
            margin-bottom: 28px;
          }

          .ih-job-company-logo {
            width: 125px;
            height: 125px;
            display: grid;
            place-items: center;
            border-radius: 20px;
            background: #fff;
            color: #15192d;
            font-size: 45px;
            font-weight: 900;
            overflow: hidden;
          }

          .ih-job-company-logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          .ih-job-heading h1 {
            margin: 0 0 12px;
            font-size: clamp(25px, 3vw, 39px);
            font-weight: 850;
            letter-spacing: -1px;
          }

          .ih-job-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 15px;
          }

          .ih-job-match-badge,
          .ih-job-featured-badge {
            padding: 9px 20px;
            border-radius: 30px;
            font-size: 14px;
            font-weight: 850;
          }

          .ih-job-match-badge {
            background: linear-gradient(120deg, #087c35, #08c75b);
            color: white;
            box-shadow: 0 0 15px rgba(0, 220, 100, 0.2);
          }

          .ih-job-featured-badge {
            background: linear-gradient(120deg, #087be8, #0754db);
            color: white;
          }

          .ih-job-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 12px 24px;
            color: #e4e8f6;
            font-size: 13px;
          }

          .ih-job-header-actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .ih-job-apply-button {
            min-height: 58px;
            border: 1px solid #c34dff;
            border-radius: 13px;
            background: linear-gradient(110deg, #bd29ff, #721cff);
            color: white;
            font-size: 19px;
            font-weight: 850;
            cursor: pointer;
            box-shadow: 0 0 20px rgba(159, 40, 255, 0.25);
          }

          .ih-job-apply-button:hover {
            filter: brightness(1.15);
            transform: translateY(-1px);
          }

          .ih-job-save-button {
            min-height: 55px;
            border: 1px solid #8d8fc0;
            border-radius: 13px;
            background: #111b31;
            color: white;
            font-size: 17px;
            font-weight: 700;
            cursor: pointer;
          }

          .ih-job-save-button:hover,
          .ih-job-save-button.saved {
            border-color: #c34dff;
            color: #d86aff;
          }

          /* DETAIL TABS */

          .ih-job-tabs {
            display: flex;
            gap: 15px;
            align-items: stretch;
            border-bottom: 1px solid #526184;
            margin-bottom: 22px;
          }

          .ih-job-tabs button {
            min-width: 150px;
            padding: 15px 20px;
            border: 0;
            border-radius: 13px 13px 0 0;
            background: transparent;
            color: #e7e9f6;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
          }

          .ih-job-tabs button.active {
            background: linear-gradient(180deg, #211344, #28104c);
            color: white;
            box-shadow: 0 4px 0 #ad38ff, 0 0 15px rgba(171, 50, 255, 0.3);
          }

          .ih-job-tabs button:hover {
            color: #d76bff;
          }

          /* DETAIL CONTENT */

          .ih-job-detail-grid {
            display: grid;
            grid-template-columns: 1.25fr 1fr;
            gap: 20px;
            align-items: stretch;
          }

          .ih-job-detail-card {
            padding: 23px;
            border: 1px solid #8b83c2;
            border-radius: 19px;
            background: linear-gradient(135deg, #111d32, #081326);
            box-shadow: inset 0 0 20px rgba(95, 70, 150, 0.05);
          }

          .ih-job-detail-card h2 {
            margin: 0 0 16px;
            font-size: 22px;
            font-weight: 850;
          }

          .ih-job-description {
            color: #e3e6f3;
            font-size: 15px;
            line-height: 1.8;
            white-space: pre-line;
          }

          .ih-responsibilities-heading {
            margin-top: 32px !important;
          }

          .ih-responsibility-list {
            display: grid;
            gap: 15px;
            padding: 0;
            margin: 20px 0 0;
            list-style: none;
          }

          .ih-responsibility-list li {
            display: flex;
            align-items: flex-start;
            gap: 13px;
            color: #edf0fb;
            font-size: 15px;
            line-height: 1.5;
          }

          .ih-responsibility-list li span {
            color: #a44dff;
            font-size: 19px;
          }

          .ih-job-detail-right {
            display: grid;
            align-content: start;
            gap: 16px;
          }

          .ih-detail-skill-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .ih-detail-skill-list span {
            padding: 9px 16px;
            border: 1px solid #66739b;
            border-radius: 30px;
            background: linear-gradient(135deg, #293753, #18243d);
            color: #f5f6ff;
            font-size: 13px;
          }

          .ih-preferred-heading {
            margin-top: 23px !important;
          }

          .ih-detail-skill-list.preferred span {
            border-color: #9874d5;
            background: #211a3b;
          }

          /* MATCH ANALYSIS */

          .ih-match-analysis-content {
            display: flex;
            align-items: center;
            justify-content: space-around;
            flex-wrap: wrap;
            gap: 20px;
          }

          .ih-large-match-ring {
            width: 145px;
            height: 145px;
            flex-shrink: 0;
            display: grid;
            place-items: center;
            border-radius: 50%;
            padding: 12px;
          }

          .ih-large-match-ring > div {
            width: 100%;
            height: 100%;
            display: grid;
            place-items: center;
            border-radius: 50%;
            background: #101a2e;
          }

          .ih-large-match-ring strong {
            font-size: 29px;
            font-weight: 900;
          }

          .ih-match-legend {
            display: grid;
            gap: 17px;
            flex: 1;
            min-width: 200px;
          }

          .ih-match-legend > div {
            display: grid;
            grid-template-columns: 14px 1fr auto;
            align-items: center;
            gap: 10px;
            font-size: 13px;
          }

          .ih-match-legend strong {
            font-size: 14px;
          }

          .ih-legend-dot {
            width: 13px;
            height: 13px;
            border-radius: 4px;
          }

          .ih-legend-dot.matched {
            background: #16e99b;
          }

          .ih-legend-dot.missing {
            background: #f13d73;
          }

          .ih-legend-dot.optional {
            background: #ffc400;
          }

          .ih-company-detail-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
            margin-top: 25px;
          }

          .ih-company-detail-grid > div,
          .ih-detail-item {
            display: flex;
            flex-direction: column;
            gap: 7px;
          }

          .ih-company-detail-grid span,
          .ih-detail-item span {
            color: #aab6d3;
            font-size: 12px;
          }

          .ih-company-detail-grid strong,
          .ih-detail-item strong {
            color: #f4f5ff;
            font-size: 14px;
          }

          .ih-requirement-score {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            margin-top: 30px;
          }

          .ih-requirement-score strong {
            color: #18e99c;
            font-size: 45px;
          }

          .ih-requirement-score span {
            color: #b9c5dd;
          }

          /* SAVED JOBS AND APPLICATIONS */

          .ih-extra-section {
            margin-top: 35px;
            padding: 23px;
            border: 1px solid #493c83;
            border-radius: 17px;
            background: linear-gradient(135deg, #10192e, #0a1021);
          }

          .ih-section-heading {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 20px;
          }

          .ih-section-heading h2 {
            margin: 0 0 6px;
            font-size: 21px;
          }

          .ih-extra-count {
            padding: 8px 14px;
            border: 1px solid #9b40eb;
            border-radius: 25px;
            color: #e5c8ff;
            background: #24133d;
            font-size: 12px;
            font-weight: 800;
          }

          .ih-saved-list {
            display: grid;
            gap: 10px;
          }

          .ih-saved-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
            padding: 15px;
            border: 1px solid #334568;
            border-radius: 12px;
            background: #111c33;
          }

          .ih-saved-item p {
            margin: 6px 0 0;
          }

          .ih-saved-actions {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .ih-unsave-button {
            padding: 9px 12px;
            border: 1px solid #6b456e;
            border-radius: 8px;
            background: #21152d;
            color: #e8c9f6;
            cursor: pointer;
          }

          .ih-table-wrapper {
            overflow-x: auto;
          }

          .ih-application-table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 13px;
          }

          .ih-application-table th,
          .ih-application-table td {
            padding: 14px 12px;
            border-bottom: 1px solid #293956;
          }

          .ih-application-table th {
            color: #c9a4ff;
            font-weight: 800;
          }

          .ih-status-pill {
            display: inline-block;
            padding: 6px 11px;
            border-radius: 20px;
            background: #163c35;
            color: #48e5a9;
            font-size: 11px;
            font-weight: 800;
          }

          .ih-stipend-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 13px;
          }

          .ih-stipend-card {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 18px;
            border: 1px solid #54418e;
            border-radius: 13px;
            background: #15152e;
          }

          .ih-stipend-card span,
          .ih-stipend-card small {
            color: #b5c0dc;
          }

          .ih-stipend-card strong {
            color: #dba4ff;
            font-size: 22px;
          }

          .ih-application-feedback {
            position: fixed;
            right: 25px;
            bottom: 25px;
            z-index: 1200;
            max-width: 400px;
            padding: 15px 20px;
            border: 1px solid #22d99a;
            border-radius: 12px;
            background: #102b28;
            color: #a9ffdc;
            box-shadow: 0 5px 25px rgba(0, 0, 0, 0.4);
          }

          .ih-application-feedback button {
            margin-left: 15px;
            border: 0;
            background: transparent;
            color: white;
            font-size: 18px;
            cursor: pointer;
          }

          /* RESPONSIVE */

          @media (max-width: 1000px) {
            .ih-job-header {
              grid-template-columns: 95px minmax(0, 1fr);
            }

            .ih-job-company-logo {
              width: 95px;
              height: 95px;
            }

            .ih-job-header-actions {
              grid-column: 1 / -1;
              flex-direction: row;
            }

            .ih-job-header-actions button {
              flex: 1;
            }

            .ih-job-detail-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 600px) {
            .ih-job-detail-overlay {
              padding: 7px;
            }

            .ih-job-detail-page {
              padding: 18px 13px;
              border-radius: 14px;
            }

            .ih-job-header {
              grid-template-columns: 65px minmax(0, 1fr);
              gap: 13px;
            }

            .ih-job-company-logo {
              width: 65px;
              height: 65px;
              border-radius: 12px;
              font-size: 25px;
            }

            .ih-job-heading h1 {
              font-size: 21px;
            }

            .ih-job-meta {
              font-size: 11px;
              gap: 9px;
            }

            .ih-job-header-actions {
              grid-column: 1 / -1;
            }

            .ih-job-tabs {
              gap: 2px;
            }

            .ih-job-tabs button {
              min-width: 0;
              flex: 1;
              padding: 12px 5px;
              font-size: 12px;
            }

            .ih-job-detail-card {
              padding: 17px;
            }

            .ih-job-detail-card h2 {
              font-size: 19px;
            }

            .ih-match-analysis-content {
              flex-direction: column;
            }

            .ih-match-legend {
              width: 100%;
            }

            .ih-company-detail-grid {
              grid-template-columns: 1fr;
            }
          }
        


          .ih-recommendation-section {
            margin-top: 45px;
          }

          .ih-recommendation-hero {
  position: relative;
  min-height: 245px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  padding: 30px 5px;
}
.ih-recommendation-hero > div:first-child {
  position: relative;
  z-index: 2;
  max-width: 72%;
}

          .ih-recommendation-hero h2 {
            font-size: clamp(28px, 3vw, 38px);
            margin: 0 0 10px;
            letter-spacing: -1px;
          }

          .ih-recommendation-hero p {
            color: #bfc6dd;
            margin: 0;
            font-size: 15px;
          }

          .ih-recommendation-art {
  position: absolute;
  right: -45px;
  top: 50%;
  transform: translateY(-50%);
  width: min(56vw, 690px);
  height: auto;
  max-height: 340px;
  object-fit: contain;
  object-position: right center;
  mix-blend-mode: lighten;
  -webkit-mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  filter: drop-shadow(0 0 28px rgba(145, 30, 255, 0.38));
  z-index: 1;
  pointer-events: none;
}

          .ih-stat-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 13px;
            margin: 5px 0 24px;
            max-width: 880px;
          }

          .ih-stat-card {
            min-height: 76px;
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 13px 17px;
            border: 1px solid rgba(147, 68, 255, 0.55);
            border-radius: 13px;
            background: linear-gradient(135deg, #11172e, #10102b);
          }

          .ih-stat-icon {
            font-size: 29px;
            color: #bd42ff;
          }

          .ih-stat-value {
            font-size: 23px;
            font-weight: 800;
          }

          .ih-stat-label {
            font-size: 11px;
            color: #c2c9dd;
            margin-top: 3px;
          }

          .ih-filter-bar {
            display: grid;
            grid-template-columns: minmax(180px, 1fr) repeat(3, auto) auto;
            gap: 10px;
            margin: 20px 0 22px;
          }

          .ih-search-box,
          .ih-filter-select,
          .ih-reset-button {
            height: 43px;
            border: 1px solid #46547d;
            border-radius: 10px;
            background: #101a32;
            color: #f4f5ff;
            padding: 0 13px;
            font-size: 12px;
            outline: none;
          }

          .ih-search-box:focus,
          .ih-filter-select:focus {
            border-color: #bd43ff;
            box-shadow: 0 0 0 2px rgba(189, 67, 255, 0.13);
          }

          .ih-search-box {
            width: 100%;
          }

          .ih-search-box::placeholder {
            color: #aab4ce;
          }

          .ih-filter-select {
            cursor: pointer;
            min-width: 105px;
          }

          .ih-filter-select option {
            background: #101a32;
            color: white;
          }

          .ih-reset-button {
            cursor: pointer;
            font-weight: 700;
          }

          .ih-reset-button:hover {
            border-color: #bd43ff;
          }

          .ih-opportunity-list {
            display: grid;
            gap: 12px;
          }

          .ih-opportunity-card {
            display: grid;
            grid-template-columns: 55px minmax(180px, 1.3fr) 85px minmax(190px, 1fr) 105px;
            align-items: center;
            gap: 15px;
            min-height: 125px;
            padding: 16px;
            border: 1px solid #293b62;
            border-radius: 15px;
            background: linear-gradient(110deg, #111a31, #0c1429);
            transition: 0.2s ease;
          }

          .ih-opportunity-card:hover {
            border-color: #9042e9;
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(78, 31, 145, 0.18);
          }

          .ih-company-logo {
            height: 52px;
            width: 52px;
            display: grid;
            place-items: center;
            border-radius: 12px;
            background: #fff;
            color: #20243b;
            font-size: 23px;
            font-weight: 900;
            overflow: hidden;
          }

          .ih-company-logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          .ih-opportunity-info {
            min-width: 0;
          }

          .ih-opportunity-info h3 {
            margin: 0 0 5px;
            font-size: 15px;
            line-height: 1.35;
          }

          .ih-company-name {
            color: #d4d9eb;
            font-size: 12px;
            margin-bottom: 10px;
          }

          .ih-opportunity-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            color: #b9c2da;
            font-size: 10px;
            margin-bottom: 10px;
          }

          .ih-opportunity-skills {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
          }

          .ih-opportunity-skill {
            border: 1px solid #42517b;
            background: #1b2748;
            color: #e3e8fb;
            border-radius: 7px;
            padding: 5px 8px;
            font-size: 10px;
          }

          .ih-match-column {
            display: flex;
            justify-content: center;
            border-left: 1px solid rgba(111, 130, 176, 0.25);
            border-right: 1px solid rgba(111, 130, 176, 0.25);
            padding: 0 8px;
          }

          .ih-match-ring {
            width: 66px;
            height: 66px;
            border-radius: 50%;
            display: grid;
            place-items: center;
            padding: 6px;
          }

          .ih-match-ring-inner {
            height: 100%;
            width: 100%;
            border-radius: 50%;
            background: #10182e;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .ih-match-ring-inner strong {
            font-size: 16px;
          }

          .ih-match-ring-inner span {
            color: #27df9a;
            font-size: 9px;
          }

          .ih-breakdown {
            min-width: 0;
          }

          .ih-breakdown-title {
            font-size: 12px;
            font-weight: 800;
            margin-bottom: 10px;
          }

          .ih-breakdown-row {
            display: grid;
            grid-template-columns: 62px minmax(35px, 1fr) 32px;
            align-items: center;
            gap: 7px;
            margin: 8px 0;
            font-size: 10px;
            color: #d6dced;
          }

          .ih-progress-track {
            height: 7px;
            border-radius: 20px;
            overflow: hidden;
            background: #293653;
          }

          .ih-progress-fill {
            height: 100%;
            border-radius: 20px;
          }

          .ih-card-actions {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .ih-save-button {
            align-self: flex-end;
            background: transparent;
            border: none;
            color: #e7eafa;
            font-size: 23px;
            cursor: pointer;
            line-height: 1;
          }

          .ih-save-button.saved {
            color: #d04cff;
          }

          .ih-view-button {
            padding: 10px 9px;
            border-radius: 9px;
            background: linear-gradient(110deg, #a020ff, #6426e8);
            border: 1px solid #a74cff;
            color: white;
            font-weight: 800;
            font-size: 11px;
            cursor: pointer;
            white-space: nowrap;
          }

          .ih-view-button:hover {
            box-shadow: 0 0 16px rgba(159, 39, 255, 0.4);
          }

          .ih-empty-state {
            text-align: center;
            padding: 45px 20px;
            border: 1px dashed #505c85;
            border-radius: 14px;
            color: #bbc4dc;
          }

          .ih-pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            margin: 30px 0 15px;
          }

          .ih-page-button {
            min-width: 37px;
            height: 37px;
            border-radius: 9px;
            background: #101a32;
            border: 1px solid #35466d;
            color: white;
            cursor: pointer;
          }

          .ih-page-button.active {
            background: linear-gradient(135deg, #a529ff, #6c24e8);
            border-color: #c35cff;
            box-shadow: 0 0 15px rgba(157, 42, 255, 0.3);
          }

          .ih-page-button:disabled {
            opacity: 0.35;
            cursor: not-allowed;
          }

          @media (max-width: 950px) {
            .ih-opportunity-card {
              grid-template-columns: 48px minmax(150px, 1fr) 75px minmax(150px, 1fr);
            }

            .ih-card-actions {
              grid-column: 2 / -1;
              flex-direction: row;
              justify-content: flex-end;
            }

            .ih-save-button {
              align-self: center;
            }

            .ih-filter-bar {
              grid-template-columns: 1fr 1fr;
            }

            .ih-search-box {
              grid-column: 1 / -1;
            }
          }

          @media (max-width: 600px) {
            .ih-recommendation-art {
  position: absolute;
  right: -45px;
  top: 50%;
  transform: translateY(-50%);
  width: min(56vw, 690px);
  height: auto;
  max-height: 340px;
  object-fit: contain;
  object-position: right center;
  mix-blend-mode: lighten;
  -webkit-mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  filter: drop-shadow(0 0 28px rgba(145, 30, 255, 0.38));
  z-index: 1;
  pointer-events: none;
}

            .ih-stat-grid {
              grid-template-columns: 1fr;
            }

            .ih-filter-bar {
              grid-template-columns: 1fr 1fr;
            }

            .ih-opportunity-card {
              grid-template-columns: 48px 1fr 70px;
              gap: 10px;
            }

            .ih-breakdown {
              grid-column: 1 / -1;
              padding-top: 12px;
              border-top: 1px solid rgba(111, 130, 176, 0.25);
            }

            .ih-card-actions {
              grid-column: 1 / -1;
            }

            .ih-match-column {
              border-right: none;
            }
          }

/* INTERNHUB_REFERENCE_SCALE_V1 */

.ih-navbar {
height: 94px;
padding-inline: 3.6%;
}

.ih-brand {
font-size: clamp(27px, 2vw, 34px);
gap: 15px;
}

.ih-brand-icon {
width: 52px;
height: 52px;
font-size: 31px;
border-radius: 13px;
}

.ih-navlinks {
gap: clamp(25px, 3.2vw, 60px);
}

.ih-navlinks a {
font-size: clamp(17px, 1.25vw, 22px);
}

.ih-profile {
font-size: 19px;
gap: 14px;
}

.ih-avatar {
width: 62px;
height: 62px;
font-size: 24px;
}

.ih-container {
width: min(1760px, 93.5%);
max-width: none;
}

.ih-hero {
min-height: 275px;
padding: 45px 12px 28px;
}

.ih-hero-copy {
max-width: 980px;
}

.ih-eyebrow {
font-size: 15px;
letter-spacing: 3.5px;
margin-bottom: 20px;
}

.ih-hero h1 {
font-size: clamp(44px, 4.1vw, 68px);
line-height: 1.08;
letter-spacing: -2px;
margin-bottom: 16px;
}

.ih-hero p {
font-size: clamp(19px, 1.65vw, 27px);
line-height: 1.5;
}

.ih-hero-art {
width: clamp(300px, 28vw, 470px);
height: 260px;
margin-right: 20px;
}

.ih-progress {
max-width: 900px;
margin-bottom: 42px;
}

.ih-progress-step {
min-width: 155px;
gap: 12px;
font-size: 16px;
}

.ih-progress-number {
width: 44px;
height: 44px;
font-size: 19px;
}

.ih-progress-line {
max-width: 190px;
margin-inline: 16px;
}

.ih-upload-grid {
grid-template-columns: minmax(0, 1.65fr) minmax(360px, 1fr);
gap: 24px;
}

.ih-panel {
padding: 25px;
border-radius: 20px;
}

.ih-upload-panel {
min-height: 500px;
}

.ih-dropzone {
min-height: 310px;
padding: 35px;
border-radius: 18px;
}

.ih-upload-icon {
width: 76px;
height: 76px;
font-size: 38px;
margin-bottom: 20px;
}

.ih-dropzone strong {
font-size: 24px;
}

.ih-dropzone span {
font-size: 17px;
}

.ih-primary-button {
padding: 16px 30px;
font-size: 18px;
border-radius: 13px;
}

.ih-extract-button {
min-width: min(470px, 100%);
font-size: 19px;
padding: 18px 25px;
}

.ih-file-row {
min-height: 76px;
padding: 16px 19px;
}

.ih-file-name {
font-size: 17px;
}

.ih-file-size {
font-size: 14px;
}

.ih-side-column {
gap: 20px;
}

.ih-side-card {
padding: 25px;
}

.ih-side-card h3 {
font-size: 25px;
margin-bottom: 20px;
}

.ih-how-item {
gap: 17px;
margin: 19px 0;
}

.ih-how-icon {
width: 48px;
height: 48px;
font-size: 22px;
}

.ih-how-item strong {
font-size: 18px;
}

.ih-how-item p {
font-size: 15px;
line-height: 1.6;
}

.ih-feature-list {
gap: 17px;
}

.ih-feature-list li {
font-size: 16px;
}

.ih-section {
margin-top: 26px;
padding: 26px;
border-radius: 20px;
}

.ih-section-heading h2 {
font-size: 27px;
}

.ih-muted {
font-size: 15px;
}

.ih-skill-layout {
grid-template-columns: 190px 1fr;
gap: 30px;
}

.ih-skill-ring {
width: 170px;
height: 170px;
}

.ih-skill-ring-inner strong {
font-size: 35px;
}

.ih-skill-ring-inner span {
font-size: 14px;
}

.ih-skill-groups {
gap: 18px;
}

.ih-skill-group {
grid-template-columns: 180px 1fr;
gap: 18px;
}

.ih-skill-category {
font-size: 16px;
}

.ih-skill-chip {
padding: 9px 15px;
font-size: 14px;
border-radius: 11px;
}

/* RECOMMENDATION HERO AND METRICS */

.ih-recommendation-section {
margin-top: 55px;
}

.ih-recommendation-hero {
  position: relative;
  min-height: 245px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  padding: 30px 5px;
}
.ih-recommendation-hero > div:first-child {
  position: relative;
  z-index: 2;
  max-width: 72%;
}

.ih-recommendation-hero h2 {
font-size: clamp(43px, 4vw, 66px);
line-height: 1.08;
letter-spacing: -2px;
margin-bottom: 16px;
}

.ih-recommendation-hero p {
font-size: clamp(19px, 1.6vw, 26px);
line-height: 1.5;
}

.ih-recommendation-art {
  position: absolute;
  right: -45px;
  top: 50%;
  transform: translateY(-50%);
  width: min(56vw, 690px);
  height: auto;
  max-height: 340px;
  object-fit: contain;
  object-position: right center;
  mix-blend-mode: lighten;
  -webkit-mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  filter: drop-shadow(0 0 28px rgba(145, 30, 255, 0.38));
  z-index: 1;
  pointer-events: none;
}

.ih-stat-grid {
max-width: 1140px;
gap: 20px;
margin: 10px 0 35px;
}

.ih-stat-card {
min-height: 132px;
gap: 22px;
padding: 22px 28px;
border-radius: 20px;
}

.ih-stat-icon {
font-size: 48px;
}

.ih-stat-value {
font-size: 43px;
line-height: 1.1;
}

.ih-stat-label {
font-size: 18px;
margin-top: 8px;
}

/* SEARCH AND FILTER CONTROLS */

.ih-filter-bar {
grid-template-columns: minmax(300px, 1fr) repeat(3, auto) auto;
gap: 17px;
margin: 28px 0 35px;
}

.ih-search-box,
.ih-filter-select,
.ih-reset-button {
height: 76px;
border-radius: 18px;
padding-inline: 23px;
font-size: 19px;
border-width: 1.5px;
}

.ih-filter-select {
min-width: 175px;
}

.ih-reset-button {
min-width: 155px;
font-size: 19px;
}

/* INTERNSHIP CARDS */

.ih-opportunity-list {
gap: 18px;
}

.ih-opportunity-card {
grid-template-columns: 72px minmax(230px, 1.3fr) 112px minmax(230px, 1fr) 140px;
gap: 21px;
min-height: 165px;
padding: 23px;
border-radius: 19px;
}

.ih-company-logo {
width: 66px;
height: 66px;
border-radius: 15px;
font-size: 29px;
}

.ih-opportunity-info h3 {
font-size: 20px;
margin-bottom: 8px;
}

.ih-company-name {
font-size: 16px;
margin-bottom: 12px;
}

.ih-opportunity-meta {
gap: 15px;
font-size: 13px;
margin-bottom: 12px;
}

.ih-opportunity-skill {
padding: 7px 11px;
font-size: 12px;
border-radius: 9px;
}

.ih-match-ring {
width: 88px;
height: 88px;
padding: 7px;
}

.ih-match-ring-inner strong {
font-size: 21px;
}

.ih-match-ring-inner span {
font-size: 11px;
}

.ih-breakdown-title {
font-size: 15px;
margin-bottom: 12px;
}

.ih-breakdown-row {
grid-template-columns: 76px minmax(45px, 1fr) 38px;
gap: 9px;
margin: 10px 0;
font-size: 12px;
}

.ih-progress-track {
height: 9px;
}

.ih-view-button {
padding: 14px 12px;
font-size: 14px;
border-radius: 11px;
}

.ih-save-button {
font-size: 27px;
}

.ih-empty-state {
padding: 65px 25px;
font-size: 18px;
}

.ih-page-button {
min-width: 45px;
height: 45px;
font-size: 15px;
}

/* JOB DETAILS */

.ih-job-detail-page {
max-width: 1700px;
padding: 32px 40px 45px;
}

.ih-job-heading h1 {
font-size: clamp(34px, 3vw, 48px);
}

.ih-job-detail-card {
padding: 30px;
}

.ih-job-detail-card h2 {
font-size: 27px;
}

.ih-job-description,
.ih-responsibility-list li {
font-size: 17px;
}

/* TABLET */

@media (max-width: 1100px) {
.ih-navbar {
padding-inline: 3%;
}

.ih-navlinks {
gap: 18px;
}

.ih-navlinks a {
font-size: 14px;
}

.ih-container {
width: 94%;
}

.ih-upload-grid {
grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr);
}

.ih-opportunity-card {
grid-template-columns: 55px minmax(150px, 1fr) 85px minmax(150px, 1fr);
}

.ih-card-actions {
grid-column: 2 / -1;
flex-direction: row;
justify-content: flex-end;
}
}

/* MOBILE */

@media (max-width: 700px) {
.ih-navbar {
height: 68px;
padding-inline: 4%;
}

.ih-brand {
font-size: 21px;
}

.ih-brand-icon {
width: 37px;
height: 37px;
font-size: 23px;
}

.ih-profile {
font-size: 12px;
}

.ih-avatar {
width: 36px;
height: 36px;
}

.ih-container {
width: 92%;
}

.ih-hero {
min-height: 155px;
padding: 28px 0 18px;
}

.ih-hero h1,
.ih-recommendation-hero h2 {
font-size: 34px;
letter-spacing: -1px;
}

.ih-hero p,
.ih-recommendation-hero p {
font-size: 15px;
}

.ih-hero-art {
display: none;
}

.ih-progress {
margin-bottom: 25px;
}

.ih-progress-step {
min-width: 75px;
font-size: 10px;
}

.ih-progress-number {
width: 34px;
height: 34px;
font-size: 14px;
}

.ih-upload-grid {
grid-template-columns: 1fr;
gap: 15px;
}

.ih-panel,
.ih-side-card,
.ih-section {
padding: 16px;
}

.ih-upload-panel {
min-height: 0;
}

.ih-dropzone {
min-height: 230px;
padding: 20px 12px;
}

.ih-dropzone strong {
font-size: 18px;
}

.ih-dropzone span {
font-size: 13px;
}

.ih-primary-button {
font-size: 14px;
padding: 13px 18px;
}

.ih-extract-button {
font-size: 15px;
}

.ih-side-card h3 {
font-size: 19px;
}

.ih-how-item strong {
font-size: 14px;
}

.ih-how-item p,
.ih-feature-list li {
font-size: 12px;
}

.ih-skill-layout {
grid-template-columns: 1fr;
justify-items: center;
}

.ih-skill-ring {
width: 125px;
height: 125px;
}

.ih-skill-group {
grid-template-columns: 1fr;
gap: 8px;
}

.ih-recommendation-section {
margin-top: 30px;
}

.ih-recommendation-hero {
  position: relative;
  min-height: 245px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  padding: 30px 5px;
}
.ih-recommendation-hero > div:first-child {
  position: relative;
  z-index: 2;
  max-width: 72%;
}

.ih-recommendation-art {
  position: absolute;
  right: -45px;
  top: 50%;
  transform: translateY(-50%);
  width: min(56vw, 690px);
  height: auto;
  max-height: 340px;
  object-fit: contain;
  object-position: right center;
  mix-blend-mode: lighten;
  -webkit-mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  filter: drop-shadow(0 0 28px rgba(145, 30, 255, 0.38));
  z-index: 1;
  pointer-events: none;
}

.ih-stat-grid {
grid-template-columns: 1fr;
gap: 11px;
margin-bottom: 22px;
}

.ih-stat-card {
min-height: 85px;
padding: 14px 17px;
border-radius: 13px;
}

.ih-stat-icon {
font-size: 30px;
}

.ih-stat-value {
font-size: 25px;
}

.ih-stat-label {
font-size: 12px;
}

.ih-filter-bar {
grid-template-columns: 1fr 1fr;
gap: 9px;
margin: 18px 0 22px;
}

.ih-search-box {
grid-column: 1 / -1;
}

.ih-search-box,
.ih-filter-select,
.ih-reset-button {
height: 46px;
min-width: 0;
padding-inline: 11px;
font-size: 12px;
border-radius: 10px;
}

.ih-reset-button {
min-width: 0;
}

.ih-opportunity-card {
grid-template-columns: 45px minmax(0, 1fr) 65px;
gap: 10px;
min-height: 0;
padding: 13px;
}

.ih-company-logo {
width: 43px;
height: 43px;
font-size: 19px;
}

.ih-opportunity-info h3 {
font-size: 14px;
}

.ih-company-name {
font-size: 11px;
}

.ih-opportunity-meta {
font-size: 9px;
gap: 7px;
}

.ih-opportunity-skill {
font-size: 9px;
padding: 4px 6px;
}

.ih-match-ring {
width: 59px;
height: 59px;
}

.ih-match-ring-inner strong {
font-size: 14px;
}

.ih-match-ring-inner span {
font-size: 8px;
}

.ih-breakdown {
grid-column: 1 / -1;
padding-top: 10px;
border-top: 1px solid rgba(111, 130, 176, 0.25);
}

.ih-card-actions {
grid-column: 1 / -1;
flex-direction: row;
justify-content: flex-end;
}

.ih-view-button {
font-size: 12px;
padding: 10px 13px;
}
}

        /* INTERNHUB_RECOMMENDATIONS_HERO_FINAL */

        .ih-recommendation-section {
          width: 100%;
          margin-top: 38px;
        }

        .ih-recommendation-hero {
  position: relative;
  min-height: 245px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  padding: 30px 5px;
}
.ih-recommendation-hero > div:first-child {
  position: relative;
  z-index: 2;
  max-width: 72%;
}

        .ih-recommendation-hero > div:first-child {
          flex: 1;
          min-width: 0;
        }

        .ih-recommendation-hero h2 {
          font-size: clamp(48px, 4.8vw, 72px);
          line-height: 1.08;
          font-weight: 850;
          letter-spacing: -2.5px;
          margin: 0 0 18px;
          color: #f8f9ff;
        }

        .ih-recommendation-hero p {
          font-size: clamp(19px, 1.8vw, 28px);
          line-height: 1.5;
          color: #d5dcf1;
          margin: 0;
          white-space: nowrap;
        }

        .ih-recommendation-art {
  position: absolute;
  right: -45px;
  top: 50%;
  transform: translateY(-50%);
  width: min(56vw, 690px);
  height: auto;
  max-height: 340px;
  object-fit: contain;
  object-position: right center;
  mix-blend-mode: lighten;
  -webkit-mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  filter: drop-shadow(0 0 28px rgba(145, 30, 255, 0.38));
  z-index: 1;
  pointer-events: none;
}

        .ih-stat-grid {
          width: min(100%, 1120px);
          max-width: 1120px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
          margin: 5px 0 36px 16px;
        }

        .ih-stat-card {
          min-height: 132px;
          padding: 22px 28px;
          gap: 23px;
          border: 1.5px solid #963df2;
          border-radius: 21px;
          background: linear-gradient(125deg, #11172f, #090d20);
          box-shadow: inset 0 0 20px rgba(117, 61, 220, .045);
        }

        .ih-stat-icon {
          min-width: 70px;
          font-size: 58px;
          line-height: 1;
          color: #d33cff;
          text-shadow: 0 0 20px rgba(188, 55, 255, .65);
        }

        .ih-stat-card:nth-child(2) .ih-stat-icon {
          color: #00d9ff;
          text-shadow: 0 0 20px rgba(0, 217, 255, .6);
        }

        .ih-stat-card:nth-child(3) .ih-stat-icon {
          color: #ffd21c;
          text-shadow: 0 0 20px rgba(255, 210, 28, .5);
        }

        .ih-stat-value {
          font-size: 44px;
          line-height: 1.05;
          font-weight: 850;
          color: #fff;
        }

        .ih-stat-label {
          font-size: 18px;
          font-weight: 600;
          margin-top: 9px;
          color: #f0f1fa;
          white-space: nowrap;
        }

        .ih-filter-bar {
          width: 100%;
          grid-template-columns: minmax(280px, 1fr) 1.05fr .58fr .58fr auto;
          gap: 17px;
          margin: 30px 0 38px;
        }

        .ih-search-box,
        .ih-filter-select,
        .ih-reset-button {
          height: 76px;
          border: 1.5px solid #667fc1;
          border-radius: 19px;
          background: linear-gradient(120deg, #111a33, #10152a);
          color: #f7f8ff;
          padding: 0 23px;
          font-size: 19px;
          font-weight: 650;
        }

        .ih-search-box::placeholder {
          color: #d1d9ef;
          opacity: 1;
        }

        .ih-filter-select {
          min-width: 0;
          cursor: pointer;
        }

        .ih-reset-button {
          min-width: 155px;
          cursor: pointer;
        }

        .ih-opportunity-list {
          gap: 19px;
        }

        @media (min-width: 1500px) {
          .ih-recommendation-hero {
  position: relative;
  min-height: 245px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  padding: 30px 5px;
}
.ih-recommendation-hero > div:first-child {
  position: relative;
  z-index: 2;
  max-width: 72%;
}

          .ih-recommendation-hero h2 {
            font-size: 68px;
          }

          .ih-recommendation-hero p {
            font-size: 27px;
          }

          .ih-recommendation-art {
  position: absolute;
  right: -45px;
  top: 50%;
  transform: translateY(-50%);
  width: min(56vw, 690px);
  height: auto;
  max-height: 340px;
  object-fit: contain;
  object-position: right center;
  mix-blend-mode: lighten;
  -webkit-mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  filter: drop-shadow(0 0 28px rgba(145, 30, 255, 0.38));
  z-index: 1;
  pointer-events: none;
}
        }

        @media (max-width: 1100px) {
          .ih-recommendation-hero h2 {
            font-size: clamp(38px, 5vw, 54px);
          }

          .ih-recommendation-hero p {
            white-space: normal;
          }

          .ih-recommendation-art {
  position: absolute;
  right: -45px;
  top: 50%;
  transform: translateY(-50%);
  width: min(56vw, 690px);
  height: auto;
  max-height: 340px;
  object-fit: contain;
  object-position: right center;
  mix-blend-mode: lighten;
  -webkit-mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  filter: drop-shadow(0 0 28px rgba(145, 30, 255, 0.38));
  z-index: 1;
  pointer-events: none;
}

          .ih-stat-grid {
            margin-left: 0;
          }

          .ih-filter-bar {
            grid-template-columns: 1fr 1fr;
          }

          .ih-search-box {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 650px) {
          .ih-recommendation-hero {
  position: relative;
  min-height: 245px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  padding: 30px 5px;
}
.ih-recommendation-hero > div:first-child {
  position: relative;
  z-index: 2;
  max-width: 72%;
}

          .ih-recommendation-hero h2 {
            font-size: 36px;
            letter-spacing: -1px;
          }

          .ih-recommendation-hero p {
            font-size: 15px;
          }

          .ih-recommendation-art {
  position: absolute;
  right: -45px;
  top: 50%;
  transform: translateY(-50%);
  width: min(56vw, 690px);
  height: auto;
  max-height: 340px;
  object-fit: contain;
  object-position: right center;
  mix-blend-mode: lighten;
  -webkit-mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  filter: drop-shadow(0 0 28px rgba(145, 30, 255, 0.38));
  z-index: 1;
  pointer-events: none;
}

          .ih-stat-grid {
            grid-template-columns: 1fr;
            gap: 12px;
            margin: 10px 0 24px;
          }

          .ih-stat-card {
            min-height: 88px;
            padding: 14px 18px;
          }

          .ih-stat-icon {
            min-width: 43px;
            font-size: 34px;
          }

          .ih-stat-value {
            font-size: 27px;
          }

          .ih-stat-label {
            font-size: 13px;
          }

          .ih-filter-bar {
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .ih-search-box {
            grid-column: 1 / -1;
          }

          .ih-search-box,
          .ih-filter-select,
          .ih-reset-button {
            height: 48px;
            min-width: 0;
            padding: 0 11px;
            font-size: 12px;
            border-radius: 10px;
          }
        }

        /* INTERNHUB_SEAMLESS_HERO_V2 */

        .ih-recommendation-section {
          width: 100%;
          margin-top: 12px;
        }

        .ih-recommendation-hero {
  position: relative;
  min-height: 245px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  padding: 30px 5px;
}
.ih-recommendation-hero > div:first-child {
  position: relative;
  z-index: 2;
  max-width: 72%;
}

        .ih-recommendation-hero > div:first-child {
          min-width: 0;
          width: 100%;
        }

        .ih-recommendation-hero h2 {
          font-size: clamp(48px, 4.1vw, 68px);
          line-height: 1.08;
          font-weight: 800;
          letter-spacing: -2.2px;
          white-space: nowrap;
          margin: 0 0 18px;
          color: #f8f9ff;
        }

        .ih-recommendation-hero p {
          font-size: clamp(19px, 1.65vw, 27px);
          line-height: 1.5;
          color: #d5dcf1;
          white-space: nowrap;
          margin: 0;
        }

        .ih-recommendation-art {
  position: absolute;
  right: -45px;
  top: 50%;
  transform: translateY(-50%);
  width: min(56vw, 690px);
  height: auto;
  max-height: 340px;
  object-fit: contain;
  object-position: right center;
  mix-blend-mode: lighten;
  -webkit-mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  filter: drop-shadow(0 0 28px rgba(145, 30, 255, 0.38));
  z-index: 1;
  pointer-events: none;
}

        .ih-stat-grid {
          width: min(100%, 1120px);
          max-width: 1120px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
          margin: 4px 0 34px 16px;
        }

        .ih-stat-card {
          min-height: 132px;
          padding: 20px 28px;
          gap: 22px;
          border: 1.5px solid #963df2;
          border-radius: 21px;
          background: linear-gradient(125deg, rgba(19, 25, 49, .92), rgba(9, 13, 32, .92));
          box-shadow: none;
        }

        .ih-stat-icon {
          font-size: 58px;
          line-height: 1;
        }

        .ih-stat-value {
          font-size: 44px;
          line-height: 1.05;
          font-weight: 850;
        }

        .ih-stat-label {
          font-size: 18px;
          font-weight: 600;
          margin-top: 8px;
          white-space: nowrap;
        }

        .ih-filter-bar {
          width: 100%;
          grid-template-columns: minmax(300px, 1fr) 1.05fr .58fr .58fr auto;
          gap: 17px;
          margin: 30px 0 38px;
        }

        .ih-search-box,
        .ih-filter-select,
        .ih-reset-button {
          height: 76px;
          border-radius: 19px;
          padding: 0 22px;
          font-size: 19px;
          border-width: 1.5px;
        }

        @media (max-width: 1150px) {
          .ih-recommendation-hero {
  position: relative;
  min-height: 245px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  padding: 30px 5px;
}
.ih-recommendation-hero > div:first-child {
  position: relative;
  z-index: 2;
  max-width: 72%;
}

          .ih-recommendation-hero h2 {
            font-size: clamp(38px, 4.5vw, 52px);
            white-space: normal;
          }

          .ih-recommendation-hero p {
            white-space: normal;
          }

          .ih-recommendation-art {
  position: absolute;
  right: -45px;
  top: 50%;
  transform: translateY(-50%);
  width: min(56vw, 690px);
  height: auto;
  max-height: 340px;
  object-fit: contain;
  object-position: right center;
  mix-blend-mode: lighten;
  -webkit-mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  filter: drop-shadow(0 0 28px rgba(145, 30, 255, 0.38));
  z-index: 1;
  pointer-events: none;
}

          .ih-filter-bar {
            grid-template-columns: 1fr 1fr;
          }

          .ih-search-box {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 650px) {
          .ih-recommendation-hero {
  position: relative;
  min-height: 245px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  padding: 30px 5px;
}
.ih-recommendation-hero > div:first-child {
  position: relative;
  z-index: 2;
  max-width: 72%;
}

          .ih-recommendation-hero h2 {
            font-size: 36px;
            white-space: normal;
          }

          .ih-recommendation-hero p {
            font-size: 15px;
            white-space: normal;
          }

          .ih-recommendation-art {
  position: absolute;
  right: -45px;
  top: 50%;
  transform: translateY(-50%);
  width: min(56vw, 690px);
  height: auto;
  max-height: 340px;
  object-fit: contain;
  object-position: right center;
  mix-blend-mode: lighten;
  -webkit-mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  filter: drop-shadow(0 0 28px rgba(145, 30, 255, 0.38));
  z-index: 1;
  pointer-events: none;
}

          .ih-stat-grid {
            grid-template-columns: 1fr;
            margin-left: 0;
            gap: 12px;
          }

          .ih-stat-card {
            min-height: 88px;
            padding: 14px 18px;
          }

          .ih-stat-icon {
            font-size: 36px;
          }

          .ih-stat-value {
            font-size: 29px;
          }

          .ih-stat-label {
            font-size: 13px;
          }

          .ih-filter-bar {
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .ih-search-box,
          .ih-filter-select,
          .ih-reset-button {
            height: 49px;
            font-size: 12px;
            padding: 0 10px;
            border-radius: 10px;
          }
        }
        `}</style>
      <style jsx global>{`
/* INTERNHUB_VISUAL_REFINEMENT_V1 */

.ih-container {
  width: min(1360px, 92%);
}

.ih-hero {
  min-height: 270px;
  padding: 42px 0 30px;
}

.ih-hero h1 {
  font-size: clamp(38px, 4.4vw, 54px);
  line-height: 1.08;
  letter-spacing: -1.9px;
}

.ih-hero p {
  max-width: 620px;
  font-size: 17px;
  line-height: 1.7;
}

.ih-hero-art {
  width: 330px;
  height: 220px;
  filter: drop-shadow(0 0 32px rgba(145, 30, 255, .55));
}

.ih-progress {
  max-width: 820px;
  margin-bottom: 42px;
}

.ih-progress-step {
  min-width: 145px;
  font-size: 13px;
}

.ih-progress-number {
  width: 42px;
  height: 42px;
  font-size: 17px;
}

.ih-upload-grid {
  grid-template-columns: minmax(0, 1.7fr) minmax(300px, 1fr);
  gap: 22px;
}

.ih-panel {
  padding: 25px;
  border-radius: 19px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, .22);
}

.ih-upload-panel {
  min-height: 420px;
}

.ih-dropzone {
  min-height: 255px;
  border-width: 2px;
  border-radius: 17px;
  background:
    radial-gradient(ellipse at center, rgba(139, 52, 255, .15), transparent 72%),
    rgba(92, 32, 146, .08);
}

.ih-upload-icon {
  width: 72px;
  height: 72px;
  font-size: 38px;
  margin-bottom: 20px;
}

.ih-dropzone strong {
  font-size: 19px;
}

.ih-dropzone span {
  font-size: 14px;
}

.ih-primary-button {
  padding: 15px 27px;
  border-radius: 12px;
  font-size: 15px;
}

.ih-extract-button {
  min-width: min(440px, 100%);
  padding: 17px 24px;
  font-size: 16px;
}

.ih-side-column {
  gap: 18px;
}

.ih-side-card {
  padding: 23px;
}

.ih-side-card h3 {
  font-size: 19px;
  margin-bottom: 20px;
}

.ih-how-item {
  gap: 15px;
  margin: 17px 0;
}

.ih-how-icon {
  width: 43px;
  height: 43px;
  font-size: 20px;
}

.ih-how-item strong {
  font-size: 14px;
}

.ih-how-item p {
  font-size: 12px;
  line-height: 1.65;
}

.ih-feature-list {
  gap: 15px;
}

.ih-feature-list li {
  font-size: 13px;
}

.ih-section {
  margin-top: 25px;
  padding: 25px;
  border-radius: 19px;
}

.ih-section-heading {
  padding-bottom: 17px;
  margin-bottom: 20px;
}

.ih-section-heading h2 {
  font-size: 23px;
}

.ih-muted {
  font-size: 13px;
  line-height: 1.6;
}

.ih-skill-count {
  font-size: 30px;
}

.ih-skill-layout {
  grid-template-columns: 165px minmax(0, 1fr);
  gap: 28px;
}

.ih-skill-ring {
  width: 140px;
  height: 140px;
}

.ih-skill-ring-inner strong {
  font-size: 30px;
}

.ih-skill-group {
  grid-template-columns: 165px minmax(0, 1fr);
}

.ih-skill-category {
  font-size: 13px;
}

.ih-skill-chip {
  padding: 8px 12px;
  border-radius: 9px;
  font-size: 12px;
}

.ih-recommendation-section {
  margin-top: 58px;
}

.ih-recommendation-hero {
  position: relative;
  min-height: 245px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  padding: 30px 5px;
}
.ih-recommendation-hero > div:first-child {
  position: relative;
  z-index: 2;
  max-width: 72%;
}

.ih-recommendation-hero h2 {
  font-size: clamp(34px, 3.5vw, 46px);
  letter-spacing: -1.5px;
  margin-bottom: 13px;
}

.ih-recommendation-hero p {
  max-width: 650px;
  font-size: 16px;
  line-height: 1.7;
}

.ih-recommendation-art {
  position: absolute;
  right: -45px;
  top: 50%;
  transform: translateY(-50%);
  width: min(56vw, 690px);
  height: auto;
  max-height: 340px;
  object-fit: contain;
  object-position: right center;
  mix-blend-mode: lighten;
  -webkit-mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  filter: drop-shadow(0 0 28px rgba(145, 30, 255, 0.38));
  z-index: 1;
  pointer-events: none;
}

.ih-stat-grid {
  max-width: none;
  gap: 18px;
  margin: 12px 0 30px;
}

.ih-stat-card {
  min-height: 105px;
  gap: 19px;
  padding: 20px 23px;
  border-radius: 16px;
  background: linear-gradient(135deg, #151b38, #10152d);
  box-shadow: 0 10px 28px rgba(0, 0, 0, .17);
}

.ih-stat-icon {
  font-size: 35px;
}

.ih-stat-value {
  font-size: 29px;
  letter-spacing: -.7px;
}

.ih-stat-label {
  font-size: 12px;
  margin-top: 5px;
}

.ih-filter-bar {
  grid-template-columns: minmax(220px, 1fr) repeat(3, minmax(130px, auto)) auto;
  gap: 12px;
  margin: 24px 0 25px;
}

.ih-search-box,
.ih-filter-select,
.ih-reset-button {
  height: 50px;
  border-radius: 12px;
  padding: 0 16px;
  font-size: 13px;
}

.ih-opportunity-list {
  gap: 16px;
}

.ih-opportunity-card {
  grid-template-columns: 64px minmax(190px, 1.35fr) 96px minmax(200px, 1fr) 120px;
  min-height: 150px;
  gap: 18px;
  padding: 21px;
  border-radius: 18px;
  background: linear-gradient(115deg, #141e38, #0d162c);
  box-shadow: 0 10px 28px rgba(0, 0, 0, .15);
}

.ih-company-logo {
  width: 60px;
  height: 60px;
  border-radius: 14px;
  font-size: 26px;
}

.ih-opportunity-info h3 {
  font-size: 17px;
  line-height: 1.4;
  margin-bottom: 7px;
}

.ih-company-name {
  font-size: 13px;
  margin-bottom: 11px;
}

.ih-opportunity-meta {
  gap: 13px;
  font-size: 11px;
  margin-bottom: 11px;
}

.ih-opportunity-skill {
  padding: 6px 9px;
  border-radius: 8px;
  font-size: 11px;
}

.ih-match-ring {
  width: 78px;
  height: 78px;
  padding: 7px;
}

.ih-match-ring-inner strong {
  font-size: 19px;
}

.ih-match-ring-inner span {
  font-size: 10px;
}

.ih-match-column {
  padding: 0 12px;
}

.ih-breakdown-title {
  font-size: 13px;
  margin-bottom: 12px;
}

.ih-breakdown-row {
  grid-template-columns: 72px minmax(35px, 1fr) 36px;
  gap: 8px;
  margin: 10px 0;
  font-size: 11px;
}

.ih-progress-track {
  height: 8px;
}

.ih-card-actions {
  gap: 12px;
}

.ih-save-button {
  font-size: 25px;
}

.ih-view-button {
  padding: 12px 10px;
  border-radius: 10px;
  font-size: 12px;
}

.ih-empty-state {
  padding: 60px 25px;
  border-radius: 17px;
  font-size: 14px;
  line-height: 1.7;
}

.ih-pagination {
  gap: 10px;
  margin: 35px 0 20px;
}

.ih-page-button {
  min-width: 42px;
  height: 42px;
  border-radius: 11px;
  font-size: 14px;
}

.ih-job-detail-overlay {
  padding: 25px;
  background: rgba(3, 6, 18, .96);
  backdrop-filter: blur(12px);
}

.ih-job-detail-page {
  max-width: 1580px;
  padding: 32px 38px 42px;
  border-radius: 24px;
}

.ih-job-header {
  grid-template-columns: 135px minmax(0, 1fr) 290px;
  gap: 30px;
  margin-bottom: 35px;
}

.ih-job-company-logo {
  width: 135px;
  height: 135px;
}

.ih-job-heading h1 {
  font-size: clamp(30px, 3vw, 43px);
}

.ih-job-detail-card {
  padding: 28px;
  border-radius: 20px;
}

.ih-job-detail-card h2 {
  font-size: 24px;
}

.ih-job-description,
.ih-responsibility-list li {
  font-size: 15px;
  line-height: 1.85;
}

.ih-job-tabs button {
  min-width: 165px;
  padding: 17px 22px;
  font-size: 16px;
}

.ih-job-apply-button {
  min-height: 60px;
  font-size: 18px;
}

.ih-job-save-button {
  min-height: 56px;
  font-size: 16px;
}

@media (max-width: 1100px) {
  .ih-filter-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ih-search-box {
    grid-column: 1 / -1;
  }

  .ih-opportunity-card {
    grid-template-columns: 58px minmax(0, 1fr) 88px;
  }

  .ih-breakdown {
    grid-column: 2 / -1;
    padding-top: 12px;
    border-top: 1px solid rgba(111, 130, 176, .25);
  }

  .ih-card-actions {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
  }

  .ih-save-button {
    align-self: center;
  }
}

@media (max-width: 850px) {
  .ih-hero {
    min-height: 220px;
  }

  .ih-hero-art {
    width: 245px;
  }

  .ih-upload-grid {
    grid-template-columns: 1fr;
  }

  .ih-job-header {
    grid-template-columns: 100px minmax(0, 1fr);
  }

  .ih-job-company-logo {
    width: 100px;
    height: 100px;
  }

  .ih-job-header-actions {
    grid-column: 1 / -1;
    flex-direction: row;
  }

  .ih-job-header-actions button {
    flex: 1;
  }
}

@media (max-width: 600px) {
  .ih-container {
    width: 92%;
  }

  .ih-hero {
    min-height: auto;
    padding: 32px 0 24px;
  }

  .ih-hero h1 {
    font-size: 35px;
  }

  .ih-hero p {
    font-size: 14px;
  }

  .ih-hero-art {
    display: none;
  }

  .ih-progress {
    margin-bottom: 28px;
  }

  .ih-progress-step {
    min-width: 82px;
    font-size: 10px;
  }

  .ih-progress-number {
    width: 36px;
    height: 36px;
  }

  .ih-progress-line {
    margin: 0 5px;
  }

  .ih-panel,
  .ih-section {
    padding: 17px;
    border-radius: 15px;
  }

  .ih-dropzone {
    min-height: 220px;
    padding: 18px;
  }

  .ih-skill-layout {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .ih-skill-group {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .ih-recommendation-section {
    margin-top: 40px;
  }

  .ih-recommendation-hero {
  position: relative;
  min-height: 245px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  padding: 30px 5px;
}
.ih-recommendation-hero > div:first-child {
  position: relative;
  z-index: 2;
  max-width: 72%;
}

  .ih-recommendation-hero h2 {
    font-size: 32px;
  }

  .ih-recommendation-hero p {
    font-size: 14px;
  }

  .ih-recommendation-art {
  position: absolute;
  right: -45px;
  top: 50%;
  transform: translateY(-50%);
  width: min(56vw, 690px);
  height: auto;
  max-height: 340px;
  object-fit: contain;
  object-position: right center;
  mix-blend-mode: lighten;
  -webkit-mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  filter: drop-shadow(0 0 28px rgba(145, 30, 255, 0.38));
  z-index: 1;
  pointer-events: none;
}

  .ih-stat-grid {
    grid-template-columns: 1fr;
    gap: 11px;
  }

  .ih-stat-card {
    min-height: 82px;
    padding: 15px 18px;
  }

  .ih-stat-value {
    font-size: 25px;
  }

  .ih-filter-bar {
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }

  .ih-search-box {
    grid-column: 1 / -1;
  }

  .ih-filter-select,
  .ih-reset-button {
    min-width: 0;
    font-size: 11px;
    padding: 0 9px;
  }

  .ih-opportunity-card {
    grid-template-columns: 48px minmax(0, 1fr) 68px;
    gap: 10px;
    padding: 14px;
  }

  .ih-company-logo {
    width: 46px;
    height: 46px;
    font-size: 20px;
  }

  .ih-opportunity-info h3 {
    font-size: 14px;
  }

  .ih-opportunity-meta {
    gap: 7px;
    font-size: 10px;
  }

  .ih-match-ring {
    width: 63px;
    height: 63px;
  }

  .ih-match-ring-inner strong {
    font-size: 15px;
  }

  .ih-breakdown {
    grid-column: 1 / -1;
  }

  .ih-card-actions {
    grid-column: 1 / -1;
  }

  .ih-job-detail-overlay {
    padding: 7px;
  }

  .ih-job-detail-page {
    padding: 18px 13px;
    border-radius: 14px;
  }

  .ih-job-header {
    grid-template-columns: 65px minmax(0, 1fr);
    gap: 13px;
  }

  .ih-job-company-logo {
    width: 65px;
    height: 65px;
    border-radius: 12px;
    font-size: 25px;
  }

  .ih-job-heading h1 {
    font-size: 21px;
  }

  .ih-job-detail-card {
    padding: 17px;
  }

  .ih-job-tabs {
    gap: 2px;
  }

  .ih-job-tabs button {
    min-width: 0;
    flex: 1;
    padding: 12px 5px;
    font-size: 12px;
  }
}

        /* INTERNHUB_REFERENCE_PASS_2 */

        .ih-navbar {
          height: 94px;
          padding-inline: 3.5%;
        }

        .ih-brand {
          font-size: 32px;
          gap: 15px;
        }

        .ih-brand-icon {
          width: 52px;
          height: 52px;
          font-size: 30px;
          border-radius: 13px;
        }

        .ih-navlinks {
          gap: clamp(24px, 3.2vw, 58px);
        }

        .ih-navlinks a {
          font-size: 20px;
        }

        .ih-profile {
          font-size: 18px;
          gap: 14px;
        }

        .ih-avatar {
          width: 60px;
          height: 60px;
          font-size: 23px;
        }

        .ih-container {
          width: 93.5%;
          max-width: 1760px;
          padding-top: 48px;
        }

        .ih-hero {
          min-height: 250px;
          padding: 20px 12px 30px;
        }

        .ih-hero h1 {
          font-size: clamp(46px, 4.2vw, 68px);
          line-height: 1.08;
          letter-spacing: -2px;
          margin-bottom: 17px;
        }

        .ih-hero p {
          font-size: clamp(19px, 1.6vw, 26px);
          line-height: 1.5;
        }

        .ih-eyebrow {
          font-size: 15px;
          letter-spacing: 3.5px;
          margin-bottom: 20px;
        }

        .ih-hero-art {
          width: clamp(330px, 29vw, 470px);
          height: 260px;
        }

        .ih-progress {
          max-width: 920px;
          margin: 8px auto 48px;
        }

        .ih-progress-step {
          min-width: 155px;
          font-size: 16px;
          gap: 12px;
        }

        .ih-progress-number {
          width: 44px;
          height: 44px;
          font-size: 19px;
        }

        .ih-progress-line {
          min-width: 80px;
          margin-inline: 15px;
        }

        .ih-upload-grid {
          grid-template-columns: minmax(0, 1.65fr) minmax(370px, 1fr);
          gap: 24px;
        }

        .ih-upload-card {
          padding: 25px;
          border-radius: 20px;
        }

        .ih-dropzone {
          min-height: 325px;
          padding: 35px;
          border-radius: 18px;
        }

        .ih-upload-icon {
          width: 78px;
          height: 78px;
          margin-bottom: 20px;
        }

        .ih-upload-icon svg {
          width: 43px;
          height: 43px;
        }

        .ih-dropzone h2 {
          font-size: 24px;
          margin-bottom: 10px;
        }

        .ih-dropzone p {
          font-size: 18px;
        }

        .ih-dropzone .ih-muted {
          font-size: 15px;
        }

        .ih-primary-button {
          min-height: 58px;
          padding: 15px 30px;
          font-size: 19px;
          border-radius: 14px;
        }

        .ih-file-row {
          min-height: 76px;
          padding: 15px 20px;
        }

        .ih-file-name {
          font-size: 17px;
        }

        .ih-file-size {
          font-size: 14px;
        }

        .ih-extract-button {
          min-width: min(470px, 100%);
          font-size: 19px;
          padding: 17px 25px;
        }

        .ih-side-column {
          gap: 19px;
        }

        .ih-side-card {
          padding: 25px;
          border-radius: 19px;
        }

        .ih-side-card h3 {
          font-size: 25px;
          margin-bottom: 20px;
          padding-bottom: 15px;
        }

        .ih-how-item {
          gap: 17px;
          margin: 19px 0;
        }

        .ih-how-icon {
          width: 49px;
          height: 49px;
          font-size: 22px;
        }

        .ih-how-item strong {
          font-size: 18px;
        }

        .ih-how-item p {
          font-size: 15px;
          line-height: 1.6;
        }

        .ih-feature-list {
          gap: 17px;
        }

        .ih-feature-list li {
          font-size: 16px;
        }

        .ih-section {
          margin-top: 27px;
          padding: 27px;
          border-radius: 20px;
        }

        .ih-section-heading h2 {
          font-size: 27px;
        }

        .ih-muted {
          font-size: 15px;
        }

        .ih-skill-layout {
          grid-template-columns: 190px 1fr;
          gap: 30px;
        }

        .ih-skill-ring {
          width: 170px;
          height: 170px;
        }

        .ih-skill-ring-inner strong {
          font-size: 36px;
        }

        .ih-skill-category {
          font-size: 16px;
        }

        .ih-skill-chip {
          padding: 9px 15px;
          font-size: 14px;
          border-radius: 11px;
        }

        .ih-skill-groups {
          gap: 18px;
        }

        .ih-skill-group {
          grid-template-columns: 180px 1fr;
          gap: 18px;
        }

        .ih-recommendation-section {
          margin-top: 55px;
        }

        .ih-recommendation-hero {
  position: relative;
  min-height: 245px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: hidden;
  padding: 30px 5px;
}
.ih-recommendation-hero > div:first-child {
  position: relative;
  z-index: 2;
  max-width: 72%;
}

        .ih-recommendation-hero h2 {
          font-size: clamp(43px, 4vw, 66px);
          line-height: 1.08;
          letter-spacing: -2px;
        }

        .ih-recommendation-hero p {
          font-size: clamp(19px, 1.6vw, 26px);
        }

        .ih-recommendation-art {
  position: absolute;
  right: -45px;
  top: 50%;
  transform: translateY(-50%);
  width: min(56vw, 690px);
  height: auto;
  max-height: 340px;
  object-fit: contain;
  object-position: right center;
  mix-blend-mode: lighten;
  -webkit-mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  filter: drop-shadow(0 0 28px rgba(145, 30, 255, 0.38));
  z-index: 1;
  pointer-events: none;
}

        .ih-stat-grid {
          max-width: 1140px;
          gap: 20px;
          margin: 10px 0 35px;
        }

        .ih-stat-card {
          min-height: 132px;
          padding: 22px 28px;
          border-radius: 20px;
          gap: 22px;
        }

        .ih-stat-value {
          font-size: 43px;
        }

        .ih-stat-label {
          font-size: 18px;
        }

        .ih-filter-bar {
          gap: 17px;
          margin: 28px 0 35px;
        }

        .ih-search-box,
        .ih-filter-select,
        .ih-reset-button {
          min-height: 76px;
          padding: 0 23px;
          font-size: 19px;
          border-radius: 18px;
        }

        .ih-opportunity-card {
          min-height: 165px;
          padding: 23px;
          gap: 21px;
          border-radius: 19px;
        }

        .ih-opportunity-info h3 {
          font-size: 20px;
        }

        .ih-company-name {
          font-size: 16px;
        }

        .ih-job-detail-page {
          max-width: 1700px;
          padding: 32px 40px 45px;
        }

        .ih-job-heading h1 {
          font-size: clamp(34px, 3vw, 48px);
        }

        .ih-job-detail-card {
          padding: 30px;
        }

        .ih-job-detail-card h2 {
          font-size: 27px;
        }

        .ih-job-description,
        .ih-responsibility-list li {
          font-size: 17px;
        }

        @media (max-width: 1100px) {
          .ih-navbar {
            padding-inline: 3%;
          }

          .ih-navlinks {
            gap: 17px;
          }

          .ih-navlinks a {
            font-size: 14px;
          }

          .ih-container {
            width: 94%;
          }

          .ih-upload-grid {
            grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr);
          }
        }

        @media (max-width: 700px) {
          .ih-navbar {
            height: 68px;
            padding-inline: 4%;
          }

          .ih-brand {
            font-size: 21px;
          }

          .ih-brand-icon {
            width: 38px;
            height: 38px;
            font-size: 23px;
          }

          .ih-avatar {
            width: 37px;
            height: 37px;
          }

          .ih-container {
            width: 92%;
            padding-top: 26px;
          }

          .ih-hero {
            min-height: 155px;
            padding: 22px 0;
          }

          .ih-hero h1,
          .ih-recommendation-hero h2 {
            font-size: 34px;
            letter-spacing: -1px;
          }

          .ih-hero p,
          .ih-recommendation-hero p {
            font-size: 15px;
          }

          .ih-hero-art,
          .ih-recommendation-art {
  position: absolute;
  right: -45px;
  top: 50%;
  transform: translateY(-50%);
  width: min(56vw, 690px);
  height: auto;
  max-height: 340px;
  object-fit: contain;
  object-position: right center;
  mix-blend-mode: lighten;
  -webkit-mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 88% 92% at 66% 50%, #000 52%, rgba(0,0,0,0.85) 70%, transparent 100%);
  filter: drop-shadow(0 0 28px rgba(145, 30, 255, 0.38));
  z-index: 1;
  pointer-events: none;
}

          .ih-progress {
            margin: 15px auto 25px;
          }

          .ih-progress-step {
            min-width: 75px;
            font-size: 10px;
          }

          .ih-progress-number {
            width: 34px;
            height: 34px;
            font-size: 14px;
          }

          .ih-upload-grid {
            grid-template-columns: 1fr;
            gap: 15px;
          }

          .ih-upload-card,
          .ih-side-card,
          .ih-section {
            padding: 16px;
          }

          .ih-dropzone {
            min-height: 230px;
            padding: 20px 12px;
          }

          .ih-dropzone h2 {
            font-size: 18px;
          }

          .ih-dropzone p {
            font-size: 14px;
          }

          .ih-primary-button,
          .ih-extract-button {
            min-height: 47px;
            font-size: 14px;
            padding: 12px 17px;
          }

          .ih-side-card h3 {
            font-size: 19px;
          }

          .ih-how-item strong {
            font-size: 14px;
          }

          .ih-how-item p,
          .ih-feature-list li {
            font-size: 12px;
          }

          .ih-skill-layout {
            grid-template-columns: 1fr;
            justify-items: center;
          }

          .ih-skill-ring {
            width: 125px;
            height: 125px;
          }

          .ih-skill-group {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .ih-stat-grid {
            grid-template-columns: 1fr;
            gap: 11px;
          }

          .ih-stat-card {
            min-height: 85px;
            padding: 14px 17px;
          }

          .ih-stat-value {
            font-size: 25px;
          }

          .ih-stat-label {
            font-size: 12px;
          }

          .ih-filter-bar {
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .ih-search-box {
            grid-column: 1 / -1;
          }

          .ih-search-box,
          .ih-filter-select,
          .ih-reset-button {
            min-height: 46px;
            min-width: 0;
            padding: 0 11px;
            font-size: 12px;
            border-radius: 10px;
          }

          .ih-opportunity-card {
            grid-template-columns: 45px minmax(0, 1fr) 65px;
            gap: 10px;
            min-height: 0;
            padding: 13px;
          }

          .ih-opportunity-info h3 {
            font-size: 14px;
          }

          .ih-company-name {
            font-size: 11px;
          }

          .ih-job-detail-page {
            padding: 18px 13px;
          }
        }
      `}</style>


      <StudentNavbar
        rightContent={
          <div className="flex items-center gap-3 rounded-full border border-purple-500/20 px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-fuchsia-300/60 bg-gradient-to-br from-purple-600 to-blue-500 font-bold text-white">
              {candidateName.trim().charAt(0).toUpperCase() || "S"}
            </div>
            <span className="text-sm font-medium text-slate-200">Student</span>
          </div>
        }
      />

      <div className="ih-container">
        <section className="ih-hero">
          <div className="ih-hero-copy">
            <div className="ih-eyebrow">● YOUR CAREER STARTS HERE</div>
            <h1>Upload Your Resume</h1>
            <p>
              Get personalized internship recommendations based on your skills.
            </p>
          </div>

          <img
            className="ih-hero-art"
            src="/neon-resume-upload.png"
            alt="Neon resume upload illustration"
          />
        </section>

        <section className="ih-progress">
          <div className="ih-progress-step active">
            <div className="ih-progress-number">1</div>
            <span>Upload Resume</span>
          </div>

          <div className="ih-progress-line" />

          <div className={`ih-progress-step ${extractedSkills.length ? 'done' : ''}`}>
            <div className="ih-progress-number">2</div>
            <span>Extract Skills</span>
          </div>

          <div className="ih-progress-line" />

          <div className={`ih-progress-step ${recommendations.length ? 'done' : ''}`}>
            <div className="ih-progress-number">3</div>
            <span>View Recommendations</span>
          </div>
        </section>

        <section className="ih-upload-grid">
          <div className="ih-panel ih-upload-panel">
            {savedResume && !file && (
              <div className="ih-file-row" style={{ marginBottom: 16 }}>
                <div className="ih-file-info">
                  <div className="ih-pdf-icon">PDF</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="ih-file-name">{savedResume.fileName || 'Saved resume'}</div>
                    <div className="ih-file-size">
                      {resumeRestoreLoading ? 'Restoring your saved analysis...' : 'Saved to your student profile'}
                    </div>
                  </div>
                </div>
                <div className="ih-success">{resumeRestoreLoading ? 'Loading...' : 'Saved'}</div>
                <button
                  type="button"
                  className="ih-remove-file"
                  onClick={() => setShowResumeUploader(true)}
                  aria-label="Replace saved resume"
                  title="Upload a new resume"
                >
                  ↻
                </button>
              </div>
            )}

            {(!savedResume || showResumeUploader || file) && (
              <>
                <label
                  className="ih-dropzone"
                  htmlFor="internhub-resume-file"
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.currentTarget.classList.add('dragging');
                  }}
                  onDragLeave={(event) => {
                    event.currentTarget.classList.remove('dragging');
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.currentTarget.classList.remove('dragging');
                    const droppedFile = event.dataTransfer.files?.[0];
                    if (droppedFile) setFile(droppedFile);
                  }}
                >
                  <div className="ih-upload-icon">⇧</div>
                  <strong>{savedResume ? 'Replace your saved resume' : 'Drag and drop your resume here'}</strong>
                  <span>or click to browse files</span>
                  <span style={{ marginTop: 13 }}>
                    Supports PDF or TXT files · Maximum size: 5 MB
                  </span>
                  <span
                    className="ih-primary-button"
                    style={{ marginTop: 20, display: 'inline-block' }}
                  >
                    Choose File
                  </span>
                </label>

                <input
                  id="internhub-resume-file"
                  className="ih-file-input"
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  onChange={(event) => {
                    const selected = event.target.files?.[0] || null;
                    if (selected && selected.size > 5 * 1024 * 1024) {
                      setError('File size must be 5 MB or less.');
                      setFile(null);
                      return;
                    }
                    setFile(selected);
                    setError('');
                  }}
                />
              </>
            )}

            {file && (
              <div className="ih-file-row">
                <div className="ih-file-info">
                  <div className="ih-pdf-icon">
                    {file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'TXT'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="ih-file-name">{file.name}</div>
                    <div className="ih-file-size">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                </div>

                <div className="ih-success">
                  {loading ? 'Processing...' : 'Ready'}
                </div>

                <button
                  type="button"
                  className="ih-remove-file"
                  aria-label="Remove selected file"
                  onClick={() => {
                    setFile(null);
                    setError('');
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {error && <div className="ih-error">{error}</div>}

            <div className="ih-extract-wrap">
              <button
                type="button"
                className="ih-primary-button ih-extract-button"
                disabled={!file || loading}
                onClick={handleScanAndRecommend}
              >
                {loading
                  ? 'Extracting Skills...'
                  : '✦ Extract Skills from Resume  →'}
              </button>
            </div>

            <p className="ih-muted" style={{ textAlign: 'center', marginTop: 12 }}>
              {savedResume && !file
                ? 'Your saved skills and internship recommendations are restored automatically. Upload a new resume only when you want to replace this one.'
                : 'Your resume is processed for personalized matching.'}
            </p>
          </div>

          <aside className="ih-side-column">
            <div className="ih-panel ih-side-card">
              <h3>How it Works?</h3>

              <div className="ih-how-item">
                <div className="ih-how-icon">▤</div>
                <div>
                  <strong>Upload Resume</strong>
                  <p>Upload your latest resume in PDF or TXT format.</p>
                </div>
              </div>

              <div className="ih-how-item">
                <div className="ih-how-icon">⚙</div>
                <div>
                  <strong>Extract Skills</strong>
                  <p>Our scanner identifies your technical skills and expertise.</p>
                </div>
              </div>

              <div className="ih-how-item">
                <div className="ih-how-icon">◎</div>
                <div>
                  <strong>Get Recommendations</strong>
                  <p>Discover internships that align with your skill set.</p>
                </div>
              </div>
            </div>

            <div className="ih-panel ih-side-card">
              <h3>Supported Features</h3>
              <ul className="ih-feature-list">
                <li>Automatic skill extraction</li>
                <li>Domain and role classification</li>
                <li>Personalized internship matching</li>
                <li>Match score and skill insights</li>
              </ul>
            </div>
          </aside>
        </section>

        <section className="ih-section">
          <div className="ih-section-heading">
            <div>
              <h2>Extracted Skills Preview</h2>
              <p className="ih-muted">
                Skills identified from your uploaded resume
              </p>
            </div>

            <div>
              <div className="ih-skill-count">{totalSkillsMatched}</div>
              <div className="ih-muted">Skills Found</div>
            </div>
          </div>

          {extractedSkills.length === 0 ? (
            <p className="ih-muted">
              Upload your resume and extract skills to see your skill profile here.
            </p>
          ) : (
            <div className="ih-skill-layout">
              <div className="ih-skill-ring">
                <div className="ih-skill-ring-inner">
                  <strong>{totalSkillsMatched}</strong>
                  <span>Skills Found</span>
                </div>
              </div>

              <div className="ih-skill-groups">
                {groupedSkills.map((category) => (
                  <div className="ih-skill-group" key={category.name}>
                    <div className="ih-skill-category">
                      <span>{category.icon}</span>
                      {category.name}
                    </div>
                    <div className="ih-skill-chips">
                      {category.skills.map((skill) => (
                        <span className="ih-skill-chip" key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {unmatchedSkills.length > 0 && (
                  <div className="ih-skill-group">
                    <div className="ih-skill-category">
                      <span>✦</span>
                      Other Skills
                    </div>
                    <div className="ih-skill-chips">
                      {unmatchedSkills.map((skill) => (
                        <span className="ih-skill-chip" key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
                

        <section className="ih-recommendation-section" id="recommended-internships">
          <div className="ih-recommendation-hero">
            <div>
              <div className="ih-eyebrow">MATCHED FOR YOU</div>
              <h2>Recommended Internships</h2>
              <p>
                AI-powered internship recommendations based on your resume and skills.
              </p>
            </div>

            <img
              src="/internship-recommendation.png"
              alt="Internship recommendation illustration"
              className="ih-recommendation-art"
            />
          </div>

          <div className="ih-stat-grid">
            <div className="ih-stat-card">
              <span className="ih-stat-icon">
  <svg width="46" height="46" viewBox="0 0 48 48" fill="none" style={{filter:"drop-shadow(0 0 9px #d946ef)"}}>
    <circle cx="22" cy="26" r="15" stroke="#e879f9" strokeWidth="2.8"/>
    <circle cx="22" cy="26" r="9" stroke="#d946ef" strokeWidth="2.8"/>
    <circle cx="22" cy="26" r="3" fill="#e879f9"/>
    <path d="M25 23L40 8M32 8H40V16" stroke="#f0abfc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
</span>
              <div>
                <div className="ih-stat-value">{recommendations.length}</div>
                <div className="ih-stat-label">Available Opportunities</div>
              </div>
            </div>

            <div className="ih-stat-card">
              <span className="ih-stat-icon">
  <svg width="46" height="46" viewBox="0 0 48 48" fill="none" style={{filter:"drop-shadow(0 0 9px #06d9ff)"}}>
    <path d="M7 40V27H16V40H7Z" stroke="#06d9ff" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M20 40V17H29V40H20Z" stroke="#06d9ff" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M33 40V7H42V40H33Z" stroke="#06d9ff" strokeWidth="3" strokeLinejoin="round"/>
  </svg>
</span>
              <div>
                <div className="ih-stat-value">{topMatchScore}%</div>
                <div className="ih-stat-label">Top Match Score</div>
              </div>
            </div>

            <div className="ih-stat-card">
              <span className="ih-stat-icon">
  <svg width="46" height="46" viewBox="0 0 48 48" fill="none" style={{filter:"drop-shadow(0 0 10px #facc15)"}}>
    <path d="M27 3L10 27H22L19 45L38 19H26L27 3Z" fill="#facc15" stroke="#fde047" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
</span>
              <div>
                <div className="ih-stat-value">{totalSkillsMatched}</div>
                <div className="ih-stat-label">Skills Extracted</div>
              </div>
            </div>
          </div>

          <div className="ih-filter-bar">
            <input
              className="ih-search-box"
              type="search"
              placeholder="⌕  Search internships, companies, or skills..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
            />

            <select
              className="ih-filter-select"
              value={sortOrder}
              onChange={(event) => {
                setSortOrder(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="high-low">Match: High to Low</option>
              <option value="low-high">Match: Low to High</option>
            </select>

            <select
              className="ih-filter-select"
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Type: All</option>
              <option value="internship">Internship</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="project">Project</option>
            </select>

            <select
              className="ih-filter-select"
              value={modeFilter}
              onChange={(event) => {
                setModeFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Mode: All</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>

            <button
              type="button"
              className="ih-reset-button"
              onClick={() => {
                setSearchTerm('');
                setSortOrder('high-low');
                setTypeFilter('all');
                setModeFilter('all');
                setCurrentPage(1);
              }}
            >
              ↻ Reset
            </button>
          </div>

          <div className="ih-muted" style={{ marginBottom: 12 }}>
            Showing {visibleRecommendations.length} of {filteredRecommendations.length} opportunities
          </div>

          <div className="ih-opportunity-list">
            {visibleRecommendations.length === 0 ? (
              <div className="ih-empty-state">
                {recommendations.length === 0 ? (
                  <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-400/30 bg-purple-500/10 text-3xl text-purple-300">
                      ⇧
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      Your next opportunity starts with your resume
                    </h3>
                    <p className="text-sm leading-6 text-slate-400">
                      Upload your resume and extract your skills to discover internships matched to your profile.
                    </p>
                    <label
                      htmlFor="internhub-resume-file"
                      className="ih-primary-button cursor-pointer"
                    >
                      Upload Resume
                    </label>
                    <p className="text-xs text-slate-500">
                      Supported formats: PDF and TXT
                    </p>
                  </div>
                ) : (
                  <p>No opportunities match your search or filters. Try changing your filters.</p>
                )}
              </div>
            ) : (
              visibleRecommendations.map((opportunity: any, index: number) => {
                const score = getMatchPercent(opportunity);
                const color = getMatchColor(score);
                const breakdown = getBreakdown(opportunity);
                const id = getOpportunityId(opportunity);
                const company = opportunity.company_name || opportunity.company || 'Company';
                const skills = getSkillList(opportunity);

                return (
                  <article className="ih-opportunity-card" key={id ?? index}>
                    <div className="ih-company-logo">
                      {opportunity.company_logo ? (
                        <img src={opportunity.company_logo} alt={`${company} logo`} />
                      ) : (
                        getCompanyInitial(company)
                      )}
                    </div>

                    <div className="ih-opportunity-info">
                      <h3>{opportunity.title || opportunity.role || 'Internship Opportunity'}</h3>
                      <div className="ih-company-name">{company}</div>

                      <div className="ih-opportunity-meta">
                        <span>⌖ {opportunity.location || 'Location not specified'}</span>
                        <span>▣ {getOpportunityDuration(opportunity)}</span>
                        <span>₹ {getOpportunityStipend(opportunity)}</span>
                      </div>

                      <div className="ih-opportunity-skills">
                        {skills.slice(0, 5).map((skill: string) => (
                          <span className="ih-opportunity-skill" key={skill}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="ih-match-column">
                      <div
                        className="ih-match-ring"
                        style={{
                          background: `conic-gradient(${color} ${(score ?? 0) * 3.6}deg, #293653 0deg)`,
                        }}
                      >
                        <div className="ih-match-ring-inner">
                          <strong>{score === null ? "N/A" : `${Math.round(score)}%`}</strong>
                          <span>Match</span>
                        </div>
                      </div>
                    </div>

                    <div className="ih-breakdown">
                      <div className="ih-breakdown-title">Match Breakdown</div>

                      {[
                        ['Required Skills', breakdown.requiredTotal > 0 ? (breakdown.requiredMatched / breakdown.requiredTotal) * 100 : 0],
                        ['Preferred Skills', breakdown.preferredTotal > 0 ? (breakdown.preferredMatched / breakdown.preferredTotal) * 100 : 0],
                        
                      ].map(([label, value]) => (
                        <div className="ih-breakdown-row" key={String(label)}>
                          <span>{label}</span>
                          <div className="ih-progress-track">
                            <div
                              className="ih-progress-fill"
                              style={{
                                width: `${Math.max(0, Math.min(100, Number(value)))}%`,
                                background: color,
                              }}
                            />
                          </div>
                          <strong>{Math.round(Number(value))}%</strong>
                        </div>
                      ))}
                    </div>

                    <div className="ih-card-actions">
                      <button
                        type="button"
                        className={`ih-save-button ${savedOpportunityIds.includes(id) ? 'saved' : ''}`}
                        title={savedOpportunityIds.includes(id) ? 'Unsave opportunity' : 'Save opportunity'}
                        onClick={() => toggleSavedOpportunity(id)}
                      >
                        {savedOpportunityIds.includes(id) ? '♥' : '♧'}
                      </button>

                      <button
                        type="button"
                        className="ih-view-button"
                        onClick={() => setSelectedOpportunity(opportunity)}
                      >
                        View Details →
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="ih-pagination">
              <button
                type="button"
                className="ih-page-button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  type="button"
                  key={page}
                  className={`ih-page-button ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                className="ih-page-button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                ›
              </button>
            </div>
          )}
        </section>
                {/* FULL INTERNSHIP DETAILS VIEW */}
        {selectedOpportunity && (
          <div className="ih-job-detail-overlay">
            <div className="ih-job-detail-page">

              <button
                type="button"
                className="ih-back-jobs"
                onClick={() => {
                  setSelectedOpportunity(null);
                  setDetailTab('overview');
                }}
              >
                ← Back to jobs
              </button>

              {/* JOB HEADER */}
              <div className="ih-job-header">

                <div className="ih-job-company-logo">
                  {selectedOpportunity.company_logo ? (
                    <img
                      src={selectedOpportunity.company_logo}
                      alt="Company logo"
                    />
                  ) : (
                    getCompanyInitial(
                      selectedOpportunity.company_name ||
                      selectedOpportunity.company ||
                      'Company'
                    )
                  )}
                </div>

                <div className="ih-job-heading">
                  <h1>
                    {selectedOpportunity.title ||
                      selectedOpportunity.role ||
                      'Internship Opportunity'}
                  </h1>

                  <div className="ih-job-badges">
                    <span className="ih-job-match-badge">
                      {getMatchPercent(selectedOpportunity) === null ? "Match unavailable" : `${Math.round(getMatchPercent(selectedOpportunity)!)}% Match`}
                    </span>

                    {selectedOpportunity.is_featured === true && (
                      <span className="ih-job-featured-badge">
                        Featured
                      </span>
                    )}
                  </div>

                  <div className="ih-job-meta">
                    <span>📍 {selectedOpportunity.location || selectedOpportunity.company_location || 'Location not specified'}</span>
                    <span>▣ {getOpportunityDuration(selectedOpportunity)}</span>
                    <span>▣ ₹{getOpportunityStipend(selectedOpportunity)}</span>
                    <span>
                      ◷ Posted{' '}
                      {selectedOpportunity.posted_at
                        ? new Date(selectedOpportunity.posted_at).toLocaleDateString()
                        : 'Recently'}
                    </span>
                  </div>
                </div>

                <div className="ih-job-header-actions">
                  <button
                    type="button"
                    className="ih-job-apply-button"
                    onClick={() => handleApply(selectedOpportunity)}
                  >
                    Apply Now
                  </button>

                  <button
                    type="button"
                    className={`ih-job-save-button ${
                      savedOpportunityIds.includes(
                        getOpportunityId(selectedOpportunity)
                      ) ? 'saved' : ''
                    }`}
                    onClick={() =>
                      toggleSavedOpportunity(
                        getOpportunityId(selectedOpportunity)
                      )
                    }
                  >
                    ♧ &nbsp;
                    {savedOpportunityIds.includes(
                      getOpportunityId(selectedOpportunity)
                    ) ? 'Saved Job' : 'Save Job'}
                  </button>
                </div>

              </div>

              {/* DETAIL TABS */}
              <div className="ih-job-tabs">
                <button
                  type="button"
                  className={detailTab === 'overview' ? 'active' : ''}
                  onClick={() => setDetailTab('overview')}
                >
                  Overview
                </button>

                <button
                  type="button"
                  className={detailTab === 'requirements' ? 'active' : ''}
                  onClick={() => setDetailTab('requirements')}
                >
                  Requirements
                </button>

                <button
                  type="button"
                  className={detailTab === 'company' ? 'active' : ''}
                  onClick={() => setDetailTab('company')}
                >
                  About Company
                </button>
              </div>

              {/* OVERVIEW TAB */}
              {detailTab === 'overview' && (
                <div className="ih-job-detail-grid">

                  <div className="ih-job-detail-card">
                    <h2>Job Description</h2>

                    <p className="ih-job-description">
                      {selectedOpportunity.description ||
                        'Join the team and work on exciting projects while developing your technical and professional skills.'}
                    </p>

                    <h2 className="ih-responsibilities-heading">
                      Key Responsibilities
                    </h2>

                    <ul className="ih-responsibility-list">
                      {(Array.isArray(selectedOpportunity.responsibilities)
                        ? selectedOpportunity.responsibilities
                        : [
                            'Work on real-world projects and assigned tasks',
                            'Collaborate with team members and developers',
                            'Apply technical skills to solve practical problems',
                            'Participate in reviews and team discussions',
                          ]
                      ).map((item: string, index: number) => (
                        <li key={index}>
                          <span>●</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="ih-job-detail-right">

                    <div className="ih-job-detail-card">
                      <h2>Required Skills</h2>

                      <div className="ih-detail-skill-list">
                        {getSkillList(selectedOpportunity).length > 0 ? (
                          getSkillList(selectedOpportunity).map(
                            (skill: string) => (
                              <span key={skill}>{skill}</span>
                            )
                          )
                        ) : (
                          <span>Skills not specified</span>
                        )}
                      </div>

                      <h2 className="ih-preferred-heading">
                        Preferred Skills
                      </h2>

                      <div className="ih-detail-skill-list preferred">
                        {getPreferredSkillList(selectedOpportunity).length > 0
                          ? getPreferredSkillList(selectedOpportunity).map((skill: string) => (
                              <span key={skill}>{skill}</span>
                            ))
                          : <span>Not specified</span>}
                      </div>
                    </div>

                    <div className="ih-job-detail-card ih-match-analysis">
                      <h2>Match Analysis</h2>

                      {(() => {
                        const required = getSkillList(selectedOpportunity);
                        const candidateSkills = extractedSkills.map(
                          (skill: any) =>
                            String(
                              typeof skill === 'string'
                                ? skill
                                : skill.name || skill.skill_name || ''
                            ).toLowerCase()
                        );

                        const apiMatched = normalizeSkillArray(selectedOpportunity?.matched_required_skills);
                        const matched = apiMatched.length > 0
                          ? apiMatched
                          : required.filter((skill: string) => candidateSkills.includes(skill.toLowerCase()));

                        const apiMissing = normalizeSkillArray(selectedOpportunity?.missing_required_skills);
                        const missing = (apiMatched.length > 0 || apiMissing.length > 0)
                          ? apiMissing
                          : required.filter((skill: string) => !candidateSkills.includes(skill.toLowerCase()));

                        const preferred = getPreferredSkillList(selectedOpportunity);

                        return (
                          <div className="ih-match-analysis-content">

                            <div
                              className="ih-large-match-ring"
                              style={{
                                background: `conic-gradient(#14e89b ${
                                  (getMatchPercent(selectedOpportunity) ?? 0) * 3.6
                                }deg, #273752 0deg)`,
                              }}
                            >
                              <div>
                                <strong>
                                  {getMatchPercent(selectedOpportunity) === null ? "N/A" : `${Math.round(getMatchPercent(selectedOpportunity)!)}%`}
                                </strong>
                              </div>
                            </div>

                            <div className="ih-match-legend">
                              <div>
                                <span className="ih-legend-dot matched" />
                                <span>Matched Skills</span>
                                <strong>
                                  {matched.length}/{required.length}
                                </strong>
                              </div>

                              <div>
                                <span className="ih-legend-dot missing" />
                                <span>Missing Skills</span>
                                <strong>
                                  {missing.length}/{required.length}
                                </strong>
                              </div>

                              <div>
                                <span className="ih-legend-dot optional" />
                                <span>Optional Skills</span>
                                <strong>
                                  {preferred.length}
                                </strong>
                              </div>
                            </div>

                          </div>
                        );
                      })()}
                    </div>

                  </div>
                </div>
              )}

              {/* REQUIREMENTS TAB */}
              {detailTab === 'requirements' && (
                <div className="ih-job-detail-grid">

                  <div className="ih-job-detail-card">
                    <h2>Required Skills</h2>

                    <p className="ih-job-description">
                      These are the skills associated with this opportunity.
                    </p>

                    <div className="ih-detail-skill-list">
                      {getSkillList(selectedOpportunity).map(
                        (skill: string) => (
                          <span key={skill}>{skill}</span>
                        )
                      )}
                    </div>

                    <h2 className="ih-preferred-heading">
                      Preferred Skills
                    </h2>

                    <div className="ih-detail-skill-list preferred">
                      {getPreferredSkillList(selectedOpportunity).length > 0
                        ? getPreferredSkillList(selectedOpportunity).map((skill: string) => (
                            <span key={skill}>{skill}</span>
                          ))
                        : <span>Not specified</span>}
                    </div>
                  </div>

                  <div className="ih-job-detail-card">
                    <h2>Your Skill Compatibility</h2>
                    <p className="ih-job-description">
                      Your resume has been compared with the skills required
                      for this opportunity.
                    </p>

                    <div className="ih-requirement-score">
                      <strong>
                        {getMatchPercent(selectedOpportunity) === null ? "N/A" : `${Math.round(getMatchPercent(selectedOpportunity)!)}%`}
                      </strong>
                      <span>Overall Match</span>
                    </div>
                  </div>

                  {(() => {
                    const result = evaluateAcademicEligibility(selectedOpportunity);
                    const badgeStyle: React.CSSProperties = {
                      display: 'inline-flex', alignItems: 'center', padding: '7px 12px',
                      borderRadius: 999, fontSize: 12, fontWeight: 800,
                      color: result.status === 'ELIGIBLE' ? '#39e99c' : result.status === 'NOT_ELIGIBLE' ? '#ff8b9b' : '#ffd166',
                      background: result.status === 'ELIGIBLE' ? 'rgba(20,220,145,.12)' : result.status === 'NOT_ELIGIBLE' ? 'rgba(255,80,110,.12)' : 'rgba(255,190,60,.12)',
                      border: `1px solid ${result.status === 'ELIGIBLE' ? 'rgba(20,220,145,.4)' : result.status === 'NOT_ELIGIBLE' ? 'rgba(255,80,110,.4)' : 'rgba(255,190,60,.4)'}`,
                    };
                    const hasCriteria = result.status !== 'NO_RESTRICTIONS';
                    return (
                      <div className="ih-job-detail-card" style={{ gridColumn: '1 / -1' }}>
                        <h2>Academic Eligibility</h2>
                        <p className="ih-job-description">Academic requirements are evaluated separately from your skill-match score.</p>
                        <span style={badgeStyle}>{result.label}</span>
                        {hasCriteria && result.reasons.length > 0 && (
                          <ul style={{ marginTop: 14, paddingLeft: 20, color: '#cbd5e1', lineHeight: 1.8, fontSize: 13 }}>
                            {result.reasons.map((reason: string, index: number) => <li key={index}>{reason}</li>)}
                          </ul>
                        )}
                        {result.status === 'NO_RESTRICTIONS' && <p className="ih-job-description" style={{ marginTop: 12 }}>The company has not configured academic restrictions for this opportunity.</p>}
                        <p className="ih-job-description" style={{ marginTop: 12 }}>You can still view this opportunity regardless of eligibility. Missing academic information can be updated in your student profile.</p>
                      </div>
                    );
                  })()}

                </div>
              )}

              {/* ABOUT COMPANY TAB */}
              {detailTab === 'company' && (
                <div className="ih-job-detail-card ih-company-about">
                  <h2>
                    About{' '}
                    {selectedOpportunity.company_name ||
                      selectedOpportunity.company ||
                      'Company'}
                  </h2>

                  <p className="ih-job-description">
                    {selectedOpportunity.company_description ||
                      'Company information has not been provided for this opportunity yet.'}
                  </p>

                  <div className="ih-company-detail-grid">
                    <div>
                      <span>Company</span>
                      <strong>
                        {selectedOpportunity.company_name ||
                          selectedOpportunity.company ||
                          'Not specified'}
                      </strong>
                    </div>

                    <div>
                      <span>Location</span>
                      <strong>
                        {selectedOpportunity.location || selectedOpportunity.company_location || 'Not specified'}
                      </strong>
                    </div>

                    <div>
                      <span>Website</span>
                      <strong>
                        {selectedOpportunity.company_website || selectedOpportunity.website || 'Not provided'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* GEMINI ACADEMIC EXTRACTION REVIEW */}
        {academicReviewOpen && academicReview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-fuchsia-500/40 bg-[#0b1022] p-6 shadow-[0_0_45px_rgba(168,85,247,0.18)]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">Gemini resume extraction</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Review your academic details</h2>
                  <p className="mt-2 text-sm text-slate-400">Gemini has suggested the details below from your resume. Verify or edit every value before saving. Blank fields mean the resume did not clearly provide that information.</p>
                </div>
                <button type="button" onClick={skipAcademicReview} className="rounded-lg px-3 py-2 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Close review">✕</button>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {([
                  ['degree', 'Degree', 'e.g. B.Tech', 'text'],
                  ['major', 'Branch / Specialization', 'e.g. CSE AIML', 'text'],
                  ['graduation_year', 'Graduation Year', 'e.g. 2028', 'number'],
                  ['cgpa', 'CGPA (out of 10)', 'e.g. 8.2', 'number'],
                  ['tenth_percentage', '10th Percentage', '0–100', 'number'],
                  ['twelfth_percentage', '12th Percentage', '0–100', 'number'],
                  ['diploma_percentage', 'Diploma Percentage', '0–100, if applicable', 'number'],
                  ['active_backlogs', 'Active Backlogs', 'Enter 0 only if confirmed', 'number'],
                  ['current_semester', 'Current Semester', 'e.g. 5', 'number'],
                ] as string[][]).map(([key, label, placeholder, type]) => (
                  <label key={key} className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
                    <input
                      type={type}
                      min={key === 'cgpa' ? 0 : key.includes('percentage') ? 0 : key === 'graduation_year' ? 2000 : key === 'current_semester' ? 1 : 0}
                      max={key === 'cgpa' ? 10 : key.includes('percentage') ? 100 : key === 'graduation_year' ? 2100 : key === 'current_semester' ? 20 : key === 'active_backlogs' ? 100 : undefined}
                      step={key === 'cgpa' || key.includes('percentage') ? '0.01' : '1'}
                      value={academicReview[key] ?? ''}
                      onChange={(event) => updateAcademicReviewField(key, event.target.value)}
                      placeholder={placeholder}
                      className="w-full rounded-xl border border-white/10 bg-[#080d1b] px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-400"
                    />
                    {academicReview.evidence?.[key] && (
                      <span className="mt-1 block text-[11px] text-slate-500">Resume evidence: “{academicReview.evidence[key]}”</span>
                    )}
                    {academicReview.confidence?.[key] && academicReview.confidence[key] !== 'not_found' && (
                      <span className="mt-1 block text-[10px] uppercase tracking-wide text-fuchsia-300">Gemini confidence: {academicReview.confidence[key]}</span>
                    )}
                  </label>
                ))}
              </div>

              {academicReviewMessage && <p className="mb-4 text-sm text-amber-300">{academicReviewMessage}</p>}
              <div className="flex flex-col-reverse justify-end gap-3 border-t border-white/10 pt-5 sm:flex-row">
                <button type="button" onClick={skipAcademicReview} disabled={savingAcademicReview} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50">Skip for now</button>
                <button type="button" onClick={confirmAcademicReview} disabled={savingAcademicReview} className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60">{savingAcademicReview ? 'Saving...' : 'Confirm & Save Academic Profile'}</button>
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-500">Nothing is saved to your academic profile until you confirm.</p>
            </div>
          </div>
        )}

        {academicReviewMessage && !academicReviewOpen && (
          <div className="mb-4 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 px-4 py-3 text-sm text-fuchsia-200">{academicReviewMessage}</div>
        )}

        {/* APPLICATION FEEDBACK */}
        {applyMsg && (
          <div className="ih-application-feedback">
            {applyMsg}
            <button
              type="button"
              onClick={() => setApplyMsg('')}
            >
              ×
            </button>
          </div>
        )}
                

      </div>
    </main>
  );
}

















