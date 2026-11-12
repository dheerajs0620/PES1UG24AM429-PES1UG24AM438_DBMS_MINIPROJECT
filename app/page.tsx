
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type Opportunity = {
  opportunity_id: number;
  title: string;
  company_name?: string;
  company?: string;
  opportunity_type?: string;
  stipend?: number | string | null;
  location?: string;
  duration?: string | null;
  duration_months?: number | null;
  match_score?: number | null;
};

const sampleOpportunities: Opportunity[] = [
  {
    opportunity_id: -1,
    title: 'ML Engineering Intern',
    company_name: 'Google',
    stipend: 45000,
    location: 'Remote',
    duration: '3–6 months',
    match_score: 95,
  },
  {
    opportunity_id: -2,
    title: 'Data Analyst Intern',
    company_name: 'Microsoft',
    stipend: 30000,
    location: 'Bengaluru',
    duration: '6 months',
    match_score: 88,
  },
  {
    opportunity_id: -3,
    title: 'Full Stack Intern',
    company_name: 'Amazon',
    stipend: 120000,
    location: 'Hybrid',
    duration: '4–6 months',
    match_score: 87,
  },
  {
    opportunity_id: -4,
    title: 'Computer Vision Intern',
    company_name: 'Adobe',
    stipend: 80000,
    location: 'Bengaluru',
    duration: '3 months',
    match_score: 85,
  },
];

type IconName =
  | 'infinity'
  | 'upload'
  | 'search'
  | 'briefcase'
  | 'building'
  | 'users'
  | 'target'
  | 'pin'
  | 'calendar'
  | 'wallet'
  | 'arrow'
  | 'menu'
  | 'close';

function Icon({
  name,
  size = 22,
}: {
  name: IconName;
  size?: number;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    infinity: (
      <path d="M8.5 8.5c-2.2-2.2-5.5-.8-5.5 2.5s3.3 4.7 5.5 2.5l7-7c2.2-2.2 5.5-.8 5.5 2.5s-3.3 4.7-5.5 2.5l-7-7c-2.2-2.2-5.5-.8-5.5 2.5s3.3 4.7 5.5 2.5" />
    ),
    upload: (
      <path d="M12 16V3m-5 5 5-5 5 5M5 14v6h14v-6" />
    ),
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" />
      </>
    ),
    building: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="1" />
        <path d="M9 21v-4h6v4M8 7h1m6 0h1M8 11h1m6 0h1M8 15h1m6 0h1" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
        <path d="m16.5 7.5 4-4" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="2" />
        <path d="M3 9h18M16 15h2" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function companyStyle(company: string) {
  const name = company.toLowerCase();

  if (name.includes('google')) return 'google';
  if (name.includes('microsoft')) return 'microsoft';
  if (name.includes('amazon')) return 'amazon';
  if (name.includes('adobe')) return 'adobe';

  return 'default';
}

function companyInitial(company: string) {
  const name = company.toLowerCase();

  if (name.includes('google')) return 'G';
  if (name.includes('microsoft')) return '▦';
  if (name.includes('amazon')) return 'a';
  if (name.includes('adobe')) return 'A';

  return company.trim().charAt(0).toUpperCase() || '?';
}

function formatStipend(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return Number.isFinite(amount) && amount > 0
    ? `₹${amount.toLocaleString('en-IN')}/month`
    : 'Not specified';
}

function durationFor(
  job: Opportunity,
  index: number,
  sample: boolean
) {
  if (job.duration) return job.duration;

  if (job.duration_months) {
    return `${job.duration_months} months`;
  }

  return sample
    ? ['3–6 months', '6 months', '4–6 months', '3 months'][index]
    : 'Not specified';
}

export default function HomePage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadOpportunities() {
      try {
        const response = await fetch('/api/dashboard', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Could not load opportunities');
        }

        const data = await response.json();

        if (
          active &&
          data.success &&
          Array.isArray(data.opportunities)
        ) {
          setOpportunities(data.opportunities.slice(0, 4));
        }
      } catch (error) {
        console.error(
          'Failed to load featured opportunities:',
          error
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOpportunities();

    return () => {
      active = false;
    };
  }, []);

  const usingSamples = opportunities.length === 0;
  const jobs = usingSamples ? sampleOpportunities : opportunities;

  return (
    <main className="landing-page">
      {/* NAVBAR */}
      <header className="site-header">
        <div className="nav-container">
          <Link
            href="/"
            className="brand"
            aria-label="InternHub home"
            onClick={() => setMenuOpen(false)}
          >
            <span className="brand-mark">
              <Icon name="infinity" size={43} />
            </span>
            <span>InternHub</span>
          </Link>

          <div className="nav-actions">
            <Link href="/login" className="button button-outline">
              Login
            </Link>

            <Link
              href="/signup"
              className="button button-primary"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" id="about">
        <div className="hero-copy">
          <h1 className="hero-title">
            Find Your Perfect
            <br />
            Internship with{' '}
            <span className="gradient-text">AI</span>
          </h1>

          <p className="hero-description">
            Upload your resume, discover internships matched to your
            skills, and kickstart your career with top companies.
          </p>

          <div className="hero-buttons">
            <Link
              href="/login?next=%2Frecommendations"
              className="button button-primary button-large"
            >
              <Icon name="upload" size={22} />
              Upload Resume
            </Link>

            <Link
              href="/recommendations"
              className="button button-outline button-large"
            >
              <Icon name="search" size={23} />
              Browse Jobs
            </Link>
          </div>
        </div>

        {/* Artwork is rendered through the .hero CSS background */}
        <div className="hero-art" aria-hidden="true" />
      </section>

      {/* STATISTICS */}
      <section
        className="stats-bar"
        id="stats"
        aria-label="InternHub highlights"
      >
        <div className="stat-item">
          <Icon name="briefcase" size={38} />
          <div>
            <div className="stat-value">500+</div>
            <div className="stat-label">Internships</div>
          </div>
        </div>

        <div className="stat-item">
          <Icon name="building" size={38} />
          <div>
            <div className="stat-value">200+</div>
            <div className="stat-label">Companies</div>
          </div>
        </div>

        <div className="stat-item">
          <Icon name="users" size={38} />
          <div>
            <div className="stat-value">50K+</div>
            <div className="stat-label">Students</div>
          </div>
        </div>

        <div className="stat-item">
          <Icon name="target" size={38} />
          <div>
            <div className="stat-value">95%</div>
            <div className="stat-label">Match Accuracy</div>
          </div>
        </div>
      </section>

      {/* FEATURED INTERNSHIPS */}
      <section className="featured-section" id="jobs">
        <div className="section-heading-row">
          <div>
            <h2 className="section-title">
              Featured Internships
            </h2>

            <p className="section-subtitle">
              Handpicked opportunities from leading companies
            </p>
          </div>

          <Link
            href="/recommendations"
            className="view-all-button"
          >
            View All Jobs
            <Icon name="arrow" size={18} />
          </Link>
        </div>

        <div className="jobs-grid">
          {loading && opportunities.length === 0 ? (
            sampleOpportunities.map((job, index) => (
              <article
                className="job-card"
                key={job.opportunity_id}
              >
                <div className="job-card-top">
                  <div
                    className={`company-logo ${companyStyle(
                      job.company_name || ''
                    )}`}
                  >
                    {companyInitial(job.company_name || '')}
                  </div>

                  <div className="job-main-info">
                    <h3 className="job-title">{job.title}</h3>
                    <div className="company-name">
                      {job.company_name}
                    </div>
                  </div>

                  <span className="match-badge">
                    {job.match_score}% Match
                  </span>
                </div>

                <div className="job-meta">
                  <span>
                    <Icon name="pin" size={16} />
                    {job.location}
                  </span>

                  <span>
                    <Icon name="calendar" size={16} />
                    {durationFor(job, index, true)}
                  </span>

                  <span>
                    <Icon name="wallet" size={16} />
                    {formatStipend(job.stipend)}
                  </span>
                </div>
              </article>
            ))
          ) : jobs.length > 0 ? (
            jobs.map((job, index) => {
              const company =
                job.company_name ||
                job.company ||
                'Hiring Company';

              const score =
                typeof job.match_score === 'number'
                  ? `${job.match_score}% Match`
                  : 'Featured';

              return (
                <article
                  className="job-card"
                  key={job.opportunity_id}
                >
                  <div className="job-card-top">
                    <div
                      className={`company-logo ${companyStyle(company)}`}
                    >
                      {companyInitial(company)}
                    </div>

                    <div className="job-main-info">
                      <h3 className="job-title">{job.title}</h3>
                      <div className="company-name">
                        {company}
                      </div>
                    </div>

                    <span className="match-badge">
                      {score}
                    </span>
                  </div>

                  <div className="job-meta">
                    <span>
                      <Icon name="pin" size={16} />
                      {job.location || 'Flexible'}
                    </span>

                    <span>
                      <Icon name="calendar" size={16} />
                      {durationFor(job, index, false)}
                    </span>

                    <span>
                      <Icon name="wallet" size={16} />
                      {formatStipend(job.stipend)}
                    </span>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty-message">
              No opportunities are available yet. Check back soon!
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="site-footer">
        © {new Date().getFullYear()} InternHub · Find opportunities
        that match your skills.
      </footer>
    </main>
  );
}
