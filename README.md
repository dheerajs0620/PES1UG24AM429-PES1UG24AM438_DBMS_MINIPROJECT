# InternHub – CV Skill Scanner & Company Recommender System

An AI-assisted recruitment platform that analyzes student resumes, extracts skills, and recommends relevant internships and job opportunities based on candidate profiles.

---

## 1. Project Overview

InternHub aims to simplify the internship discovery process by connecting student skills with relevant opportunities.

Students can upload their resumes, extract skills, explore recommended opportunities, view job details, and manage applications.

### Main Objectives

- Automate resume text extraction and skill identification.
- Match student skills with internship requirements.
- Recommend relevant opportunities.
- Provide a transparent view of candidate-job matching.
- Simplify internship discovery and application tracking.

---

## 2. Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js 16.4.2 |
| UI Library | React 19.3 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Next.js API Routes |
| Database | MySQL |
| Additional Database Support | PostgreSQL + pgvector |
| Database Connectivity | mysql2/promise, pg |
| Resume Processing | PDF.js |
| Authentication | JWT using jose |
| Password Security | bcryptjs |
| Runtime | Node.js |

---

## 3. Completed Work

### 3.1 Frontend

- Next.js application structure established.
- Student-facing recommendations interface implemented.
- Resume upload and extraction workflow implemented in the working recommendations experience.
- Internship recommendation cards implemented.
- Job details interface implemented.
- Search and filtering interface implemented.
- Application-related interactions implemented.
- Dark-themed visual design established.
- Resume upload and recommendation illustrations added to the public assets.

### 3.2 Resume Processing and Skill Extraction

- PDF text extraction implemented using PDF.js.
- Resume text is processed for skill identification.
- Regex-based skill extraction implemented using a skill taxonomy.
- Extracted skills are used in the student profile and recommendation workflow.
- Resume upload and extraction are integrated into the recommendations experience.

### 3.3 Recommendation System

- Student skills are compared with opportunity requirements.
- Opportunity-skill mappings are maintained in the database.
- Match scoring logic implemented.
- Recommendation cards display matching information.
- Job details include opportunity information and matching details.
- Search and filtering functionality implemented.

### 3.4 Authentication

- Student registration implemented.
- Student login implemented.
- Password hashing implemented using bcrypt.
- JWT-based authentication implemented.
- Authentication cookie configured as HTTP-only.
- Student authentication verification endpoint implemented.
- Student-only API access checks implemented.

### 3.5 Backend and API Development

The following API routes have been implemented:

| API Route | Purpose |
|---|---|
| `/api/auth/signup` | Student registration |
| `/api/auth/login` | Student login |
| `/api/auth/me` | Retrieve authenticated student |
| `/api/extract-cv` | Extract resume information and skills |
| `/api/resumes` | Save uploaded resume and extracted information |
| `/api/opportunities` | Retrieve internship/job opportunities |
| `/api/applications` | Application-related operations |
| `/api/dashboard` | Student dashboard information |
| `/api/search` | Search functionality |
| `/api/test-db` | Database connectivity testing |

### 3.6 Database

MySQL database: `tracker_db`

Tables implemented include:

- `users`
- `students`
- `companies`
- `company_members`
- `skills`
- `student_skills`
- `resumes`
- `opportunities`
- `opportunity_skills`
- `applications`
- `application_stages`
- `application_status_history`
- `saved_opportunities`
- `recommendation_history`
- `view_student_dashboard`

Additional database work:

- Student-to-skill relationships implemented.
- Opportunity-to-skill mappings populated.
- Resume records stored in the database.
- Student skills associated with resume extraction.
- Database transaction logic implemented for resume persistence.

### 3.7 Project Assets

The following assets are present in the project:

- `public/neon-resume-upload.png`
- `public/internship-recommendation.png`
- `public/pdf.worker.min.js`
- `types/pdfjs-dist.d.ts`

---

## 4. Current Project Structure

Important project directories and files:

```text
tracker-app/
│
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── me/
│   │   ├── applications/
│   │   ├── dashboard/
│   │   ├── extract-cv/
│   │   ├── opportunities/
│   │   ├── resumes/
│   │   ├── search/
│   │   └── test-db/
│   │
│   ├── recommendations/
│   │   └── page.tsx
│   │
│   └── upload/
│       └── page.tsx
│
├── lib/
│   ├── mysql.ts
│   └── postgres.ts
│
├── public/
│   ├── neon-resume-upload.png
│   ├── internship-recommendation.png
│   └── pdf.worker.min.js
│
├── types/
│   └── pdfjs-dist.d.ts
│
├── .env.local
├── package.json
└── README.md
```

---

## 5. Current Development Status

| Module | Status |
|---|---|
| Project setup | Completed |
| Frontend foundation | Completed |
| Student authentication | Implemented |
| Database connectivity | Implemented |
| Resume PDF extraction | Implemented |
| Skill extraction | Implemented |
| Resume persistence | Implemented |
| Student skill mapping | Implemented |
| Internship opportunity management | Implemented |
| Recommendation logic | Implemented |
| Job details interface | Implemented |
| Search and filtering | Implemented |
| Application functionality | Implemented |
| UI visual refinement | In progress |
| Final TypeScript validation | Pending |
| Production build verification | Pending |
| End-to-end testing | Pending |
| Final documentation and cleanup | Pending |

**Note:** Implemented means the functionality has been developed. It does not mean every module has completed final end-to-end testing.

---

## 6. Important Current Architecture Decision

### `/recommendations` – Primary Student Experience

The recommendations page is the main student-facing experience.

It is intended to handle:

1. Resume upload.
2. Resume text extraction.
3. Skill extraction.
4. Internship recommendations.
5. Job details.
6. Application-related interactions.

The working upload and extraction workflow is already integrated here.

### `/upload` – Secondary Route

The `/upload` page currently contains a separate upload experience.

The plan is to avoid maintaining duplicate skill extraction logic. Once the main recommendations workflow is stable, this route can be simplified or redirected to `/recommendations`.

**Important:** Do not replace the working recommendations extraction logic with the older upload implementation.

---

## 7. Work Currently Pending

### Priority 1 – Fix the Recommendations Page

The latest visual refinement introduced a JSX syntax error in:

`app/recommendations/page.tsx`

The injected CSS block is missing its opening template-literal backtick.

This caused approximately 277 cascading TypeScript errors.

Required actions:

- Inspect the current CSS block.
- Correct the JSX style syntax.
- Check for leftover backup `.tsx` files inside the application directory.
- Run TypeScript validation.
- Run the production build.

### Priority 2 – Complete UI Refinement

Use the reference designs as the visual target.

Focus on:

- Hero section and illustrations.
- Typography and spacing.
- Statistics cards.
- Search and filter controls.
- Recommendation cards.
- Match percentage and score breakdown.
- Job details layout.
- Responsive design.

Preserve all existing application functionality while refining the UI.

### Priority 3 – Functional Testing

Test the complete student journey:

1. Register a student account.
2. Log in.
3. Upload a resume.
4. Extract resume text.
5. Verify extracted skills.
6. Verify that skills are saved in the database.
7. Generate internship recommendations.
8. Search and filter opportunities.
9. Open job details.
10. Save or apply to opportunities.
11. Verify application records and dashboard information.

### Priority 4 – Final Cleanup

- Remove unnecessary backup files from application directories.
- Check for duplicate or unused components.
- Verify API error handling.
- Check authentication and authorization.
- Verify database consistency.
- Review responsive layouts.
- Update documentation with final implementation details.

---

## 8. Recommended Next Steps

Follow this order to avoid breaking existing functionality.

| Order | Task | Priority |
|---|---|---|
| 1 | Fix recommendations page JSX/CSS syntax | Critical |
| 2 | Run `npx tsc --noEmit` | Critical |
| 3 | Run `npm run build` | Critical |
| 4 | Verify recommendations page visually | High |
| 5 | Refine UI against reference screenshots | High |
| 6 | Test resume upload and skill extraction | High |
| 7 | Test recommendation and job details workflow | High |
| 8 | Test authentication and applications | High |
| 9 | Perform end-to-end testing | High |
| 10 | Final cleanup and README update | Medium |

---

## 9. Running the Project

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run TypeScript validation:

```bash
npx tsc --noEmit
```

Create a production build:

```bash
npm run build
```

Start the production server after a successful build:

```bash
npm start
```

---

## 10. Environment Configuration

Create a local `.env.local` file containing the required configuration.

Example variable names:

```env
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=
AUTH_SECRET=
```

Do not commit `.env.local` or expose database credentials, authentication secrets, or other sensitive configuration.

---

## 11. Development Guidelines

To keep the project stable:

- Preserve working resume extraction logic.
- Avoid duplicating backend functionality.
- Do not hardcode recommendation scores or dashboard statistics.
- Use actual database values for displayed information.
- Keep authentication checks on protected APIs.
- Validate changes with TypeScript before building.
- Test existing functionality after UI changes.
- Keep backup files outside the Next.js `app` directory.
- Update this README when major features are completed.

---

## 12. Final Project Goal

Deliver a complete student-facing internship recommendation platform that allows students to upload resumes, identify their skills, discover relevant internship opportunities, understand their match scores, and manage applications through a clean and responsive interface.

**Current focus: Stabilize the recommendations page, complete visual refinement, and verify the full student workflow without disturbing existing working functionality.**

---

*Documentation reflects the development status as of November 9, 2026.*
