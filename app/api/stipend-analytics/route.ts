
import { NextRequest, NextResponse } from "next/server";
import { mysqlPool } from "@/lib/mysql";
import type { RowDataPacket } from "mysql2";

type Row = RowDataPacket & Record<string, unknown>;

const toNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatINR = (value: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export async function GET(request: NextRequest) {
  try {
    // 1. PERIOD FILTER
    const requestedPeriod = request.nextUrl.searchParams.get("period");
    const period = requestedPeriod === "6m" ? "6m" : "all";

    const dateCondition =
      period === "6m"
        ? "AND o.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)"
        : "";

    // 2. OVERALL SUMMARY
    const [summaryRows] = await mysqlPool.query<Row[]>(`
      SELECT
        COUNT(*) AS total_opportunities,

        SUM(CASE WHEN o.opportunity_type = 'Internship' THEN 1 ELSE 0 END)
          AS total_internships,

        SUM(CASE WHEN o.opportunity_type = 'Project' THEN 1 ELSE 0 END)
          AS total_projects,

        AVG(
          CASE
            WHEN o.opportunity_type = 'Internship' AND o.stipend > 0
            THEN o.stipend
          END
        ) AS average_internship_stipend,

        MAX(
          CASE
            WHEN o.opportunity_type = 'Internship' AND o.stipend > 0
            THEN o.stipend
          END
        ) AS highest_internship_stipend,

        MIN(
          CASE
            WHEN o.opportunity_type = 'Internship' AND o.stipend > 0
            THEN o.stipend
          END
        ) AS lowest_internship_stipend,

        SUM(CASE WHEN o.stipend > 0 THEN 1 ELSE 0 END)
          AS paid_opportunities,

        SUM(CASE WHEN o.stipend = 0 THEN 1 ELSE 0 END)
          AS zero_stipend_opportunities,

        SUM(CASE WHEN o.stipend IS NULL THEN 1 ELSE 0 END)
          AS undisclosed_opportunities

      FROM Opportunities o
      WHERE o.status = 'Open'
      ${dateCondition}
    `);

    const rawSummary = summaryRows[0] || {};

    const summary = {
      total_opportunities: toNumber(rawSummary.total_opportunities),
      total_internships: toNumber(rawSummary.total_internships),
      total_projects: toNumber(rawSummary.total_projects),
      average_internship_stipend: toNumber(rawSummary.average_internship_stipend),
      highest_internship_stipend: toNumber(rawSummary.highest_internship_stipend),
      lowest_internship_stipend: toNumber(rawSummary.lowest_internship_stipend),
      paid_opportunities: toNumber(rawSummary.paid_opportunities),

      // Legacy field retained for dashboard compatibility.
      // This means zero-stipend records, not confirmed unpaid records.
      unpaid_opportunities: toNumber(rawSummary.zero_stipend_opportunities),

      zero_stipend_opportunities: toNumber(rawSummary.zero_stipend_opportunities),
      undisclosed_opportunities: toNumber(rawSummary.undisclosed_opportunities),
    };

    // 3. COMPANY-WISE STIPEND COMPARISON
    const [companyRows] = await mysqlPool.query<Row[]>(`
      SELECT
        c.company_id,
        c.name AS company_name,
        COUNT(o.opportunity_id) AS total_opportunities,
        AVG(o.stipend) AS average_stipend,
        MAX(o.stipend) AS highest_stipend

      FROM Companies c
      INNER JOIN Opportunities o
        ON c.company_id = o.company_id

      WHERE o.opportunity_type = 'Internship'
        AND o.status = 'Open'
        AND o.stipend > 0
        ${dateCondition}

      GROUP BY c.company_id, c.name
      ORDER BY average_stipend DESC, total_opportunities DESC
      LIMIT 10
    `);

    const companies = companyRows.map((row) => ({
      company_id: toNumber(row.company_id),
      company_name: String(row.company_name),
      total_opportunities: toNumber(row.total_opportunities),
      positive_stipend_listings: toNumber(row.total_opportunities),
      average_stipend: toNumber(row.average_stipend),
      highest_stipend: toNumber(row.highest_stipend),
    }));

    // 4. POSITIVE, ZERO AND UNDISCLOSED STIPEND DISTRIBUTION
    const [distributionRows] = await mysqlPool.query<Row[]>(`
      SELECT
        o.opportunity_type,

        SUM(CASE WHEN o.stipend > 0 THEN 1 ELSE 0 END) AS paid,

        SUM(CASE WHEN o.stipend = 0 THEN 1 ELSE 0 END) AS zero_stipend,

        SUM(CASE WHEN o.stipend IS NULL THEN 1 ELSE 0 END) AS undisclosed

      FROM Opportunities o
      WHERE o.status = 'Open'
        ${dateCondition}

      GROUP BY o.opportunity_type
      ORDER BY o.opportunity_type
    `);

    const distribution = distributionRows.map((row) => ({
      opportunity_type: String(row.opportunity_type),
      paid: toNumber(row.paid),

      // Legacy field retained for existing consumers.
      unpaid: toNumber(row.zero_stipend),

      zero_stipend: toNumber(row.zero_stipend),
      undisclosed: toNumber(row.undisclosed),
    }));

    // 5. ROLE-WISE INTERNSHIP STIPEND ANALYSIS
    // Role is inferred from opportunity titles.
    const [roleRows] = await mysqlPool.query<Row[]>(`
      SELECT
        classified.role,
        COUNT(*) AS opportunity_count,
        AVG(classified.stipend) AS average_stipend,
        MAX(classified.stipend) AS highest_stipend

      FROM (
        SELECT
          o.opportunity_id,
          o.stipend,

          CASE
            WHEN LOWER(o.title) REGEXP
              'machine learning|artificial intelligence|deep learning|(^|[^a-z])ai([^a-z]|$)|(^|[^a-z])ml([^a-z]|$)|computer vision|nlp|natural language'
              THEN 'AI / ML'

            WHEN LOWER(o.title) REGEXP
              'data scientist|data science|data analyst|business intelligence|analytics'
              THEN 'Data Science'

            WHEN LOWER(o.title) REGEXP
              'data engineer|data engineering|big data|etl developer|data pipeline'
              THEN 'Data Engineering'

            WHEN LOWER(o.title) REGEXP
              'devops|cloud engineer|cloud computing|site reliability|(^|[^a-z])sre([^a-z]|$)|platform engineer'
              THEN 'DevOps / Cloud'

            WHEN LOWER(o.title) REGEXP
              'cybersecurity|security engineer|network security|information security|penetration testing|ethical hacker'
              THEN 'Cybersecurity'

            WHEN LOWER(o.title) REGEXP
              'frontend|front-end|backend|back-end|full stack|fullstack|software engineer|software developer|(^|[^a-z])sde([^a-z]|$)|web developer|application developer|mobile developer|android developer|ios developer'
              THEN 'Software Development'

            WHEN LOWER(o.title) REGEXP
              'product manager|product analyst|ui designer|ux designer|product design'
              THEN 'Product / Design'

            WHEN LOWER(o.title) REGEXP
              'qa engineer|quality assurance|test engineer|automation tester|manual tester'
              THEN 'QA / Testing'

            ELSE 'Other'
          END AS role

        FROM Opportunities o
        WHERE o.status = 'Open'
          AND o.opportunity_type = 'Internship'
          AND o.stipend > 0
          ${dateCondition}
      ) AS classified

      GROUP BY classified.role
      ORDER BY average_stipend DESC
    `);

    const byRole = roleRows.map((row) => ({
      role: String(row.role),
      opportunity_count: toNumber(row.opportunity_count),
      average_stipend: toNumber(row.average_stipend),
      highest_stipend: toNumber(row.highest_stipend),
    }));

    // 6. LOCATION-WISE INTERNSHIP STIPEND ANALYSIS
    const [cityRows] = await mysqlPool.query<Row[]>(`
      SELECT
        COALESCE(
          NULLIF(TRIM(c.location), ''),
          'Location not specified'
        ) AS city,

        COUNT(o.opportunity_id) AS opportunity_count,
        AVG(o.stipend) AS average_stipend,
        MAX(o.stipend) AS highest_stipend

      FROM Opportunities o
      INNER JOIN Companies c
        ON o.company_id = c.company_id

      WHERE o.status = 'Open'
        AND o.opportunity_type = 'Internship'
        AND o.stipend > 0
        ${dateCondition}

      GROUP BY city
      ORDER BY average_stipend DESC
      LIMIT 10
    `);

    const byCity = cityRows.map((row) => ({
      city: String(row.city),
      opportunity_count: toNumber(row.opportunity_count),
      average_stipend: toNumber(row.average_stipend),
      highest_stipend: toNumber(row.highest_stipend),
    }));

    // 7. STIPEND BRACKET DISTRIBUTION
    // Only positive-stipend open internships are included.
    const [bracketRows] = await mysqlPool.query<Row[]>(`
      SELECT
        CASE
          WHEN o.stipend < 10000 THEN 'Below ₹10,000'
          WHEN o.stipend < 25000 THEN '₹10,000 – ₹24,999'
          WHEN o.stipend < 50000 THEN '₹25,000 – ₹49,999'
          WHEN o.stipend < 100000 THEN '₹50,000 – ₹99,999'
          ELSE '₹1,00,000 and above'
        END AS bracket,

        COUNT(*) AS opportunity_count

      FROM Opportunities o
      WHERE o.status = 'Open'
        AND o.opportunity_type = 'Internship'
        AND o.stipend > 0
        ${dateCondition}

      GROUP BY bracket
      ORDER BY MIN(o.stipend)
    `);

    const bracketTotal = bracketRows.reduce(
      (total, row) => total + toNumber(row.opportunity_count),
      0
    );

    const byBracket = bracketRows.map((row) => ({
      bracket: String(row.bracket),
      opportunity_count: toNumber(row.opportunity_count),
      percentage:
        bracketTotal > 0
          ? Number(
              (
                (toNumber(row.opportunity_count) / bracketTotal) *
                100
              ).toFixed(1)
            )
          : 0,
    }));

    // 8. OPPORTUNITY-TYPE COMPARISON
    const [typeRows] = await mysqlPool.query<Row[]>(`
      SELECT
        o.opportunity_type,
        COUNT(*) AS opportunity_count,

        AVG(
          CASE WHEN o.stipend > 0 THEN o.stipend END
        ) AS average_stipend,

        SUM(CASE WHEN o.stipend > 0 THEN 1 ELSE 0 END)
          AS paid_count,

        SUM(CASE WHEN o.stipend = 0 THEN 1 ELSE 0 END)
          AS zero_stipend_count,

        SUM(CASE WHEN o.stipend IS NULL THEN 1 ELSE 0 END)
          AS undisclosed_count

      FROM Opportunities o
      WHERE o.status = 'Open'
        ${dateCondition}

      GROUP BY o.opportunity_type
      ORDER BY opportunity_count DESC
    `);

    const byType = typeRows.map((row) => ({
      opportunity_type: String(row.opportunity_type),
      opportunity_count: toNumber(row.opportunity_count),
      average_stipend: toNumber(row.average_stipend),
      paid_count: toNumber(row.paid_count),
      zero_stipend_count: toNumber(row.zero_stipend_count),
      undisclosed_count: toNumber(row.undisclosed_count),
    }));

    // 9. ADDITIONAL METRICS
    const [companyCountRows] = await mysqlPool.query<Row[]>(`
      SELECT COUNT(DISTINCT o.company_id) AS total_companies
      FROM Opportunities o
      WHERE o.status = 'Open'
        AND o.opportunity_type = 'Internship'
        AND o.stipend > 0
        ${dateCondition}
    `);

    const internshipDistribution = distribution.find(
      (item) => item.opportunity_type === "Internship"
    );

    const internshipPaid = internshipDistribution?.paid ?? 0;
    const internshipZero = internshipDistribution?.zero_stipend ?? 0;
    const internshipUndisclosed = internshipDistribution?.undisclosed ?? 0;

    const internshipKnownTotal = internshipPaid + internshipZero;

    const positiveInternshipPercentage =
      internshipKnownTotal > 0
        ? Number(
            ((internshipPaid / internshipKnownTotal) * 100).toFixed(1)
          )
        : 0;

    const metrics = {
      companies_represented: toNumber(companyCountRows[0]?.total_companies),
      stipend_bracket_count: byBracket.length,
      positive_internships: internshipPaid,
      zero_stipend_internships: internshipZero,
      undisclosed_internships: internshipUndisclosed,
      positive_internship_percentage: positiveInternshipPercentage,
    };

    // 10. AUTOMATIC KEY TAKEAWAYS
    const takeaways: string[] = [];

    if (summary.average_internship_stipend > 0) {
      takeaways.push(
        `The average disclosed internship stipend is ${formatINR(
          summary.average_internship_stipend
        )}.`
      );
    }

    if (companies.length > 0) {
      const topCompany = companies[0];

      takeaways.push(
        `${topCompany.company_name} has the highest average listed stipend (${formatINR(
          topCompany.average_stipend
        )}), based on ${topCompany.positive_stipend_listings} positive-stipend listing(s).`
      );
    }

    if (byRole.length > 0) {
      takeaways.push(
        `${byRole[0].role} has the highest average among the inferred role categories (${formatINR(
          byRole[0].average_stipend
        )}).`
      );
    }

    if (byCity.length > 0) {
      takeaways.push(
        `${byCity[0].city} has the highest average among the listed locations (${formatINR(
          byCity[0].average_stipend
        )}), across ${byCity[0].opportunity_count} positive-stipend listing(s).`
      );
    }

    if (internshipKnownTotal > 0) {
      takeaways.push(
        `${positiveInternshipPercentage}% of internships with a recorded zero-or-positive stipend value have a positive stipend.`
      );
    }

    if (summary.total_opportunities > 0) {
      takeaways.push(
        `There are ${summary.total_opportunities} open opportunities in the selected period.`
      );
    }

    if (internshipUndisclosed > 0) {
      takeaways.push(
        `${internshipUndisclosed} open internship(s) have an undisclosed stipend value.`
      );
    }

    // 11. RESPONSE
    return NextResponse.json({
      success: true,
      period,

      // Original fields retained for dashboard compatibility.
      summary,
      companies,
      distribution,

      // Additional analytics.
      byRole,
      byCity,
      byBracket,
      byType,
      takeaways,
      metrics,

      dataNotes: {
        currency: "INR",
        stipendPeriod: "Not specified in database",
        roleSource: "Inferred from Opportunities.title",
        citySource: "Companies.location",
        bracketScope:
          "Open internships with stipend greater than zero",
        periodSource: "Opportunities.created_at",
        defaultPeriod: "All time",
        zeroStipendMeaning:
          "A zero stipend does not establish whether an opportunity is unpaid or undisclosed.",
        nullStipendMeaning:
          "A NULL stipend is treated as undisclosed and counted separately.",
        companyRanking:
          "Companies are ranked using positive-stipend open internship listings. Listing count is shown as the sample size.",
        averageScope:
          "Average stipend calculations include positive stipend values only.",
      },
    });
  } catch (error) {
    console.error("Stipend analytics error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch stipend analytics.",
      },
      { status: 500 }
    );
  }
}
