import { createProject, createProjectWithEnvelopes } from "./firestoreService";

const SAMPLE_PROJECTS = [
  {
    name: "Infrastructure Development",
    shortName: "Infrastructure Development",
    refNumber: "TND/2025/001",
    clientName: "Ministry of Works",
    submissionDate: "2025-06-30",
    submissionTime: "10:00",
    submissionAddress: "123 Government Complex,\nKuala Lumpur,\nMalaysia",
    budget: "50,000,000",
    category: "infrastructure",
    contactPersonName: "Ahmad bin Ismail",
    contactPersonPhone: "012-345 6789",
    contactPersonEmail: "",
    clientRefNumber: "JKR/2025/001",
    status: "draft",
    description: "Major infrastructure development project covering design, construction, and commissioning.",
  },
  {
    name: "Consultancy Services",
    shortName: "Consultancy Services",
    refNumber: "TND/2025/002",
    clientName: "Public Works Department",
    submissionDate: "2025-07-15",
    submissionTime: "14:00",
    submissionAddress: "456 Administrative Centre,\nPutrajaya,\nMalaysia",
    budget: "2,500,000",
    category: "consultancy",
    contactPersonName: "Siti binti Abdullah",
    contactPersonPhone: "019-876 5432",
    contactPersonEmail: "",
    clientRefNumber: "JKR/2025/002",
    status: "submitted",
    description: "Consultancy services for urban transport planning and feasibility study.",
  },
];

/**
 * Seeds Firestore with sample tender document projects.
 * Can be called from the Dashboard.
 */
export async function seedSampleData(): Promise<string[]> {
  const ids: string[] = [];

  // Project with envelopes
  const id1 = await createProjectWithEnvelopes(
    { ...SAMPLE_PROJECTS[0], hasEnvelopes: true, status: SAMPLE_PROJECTS[0].status as "draft" },
    [
      { title: "Technical Proposal", sortOrder: 0 },
      { title: "Commercial Proposal", sortOrder: 1 },
      { title: "Financial Capacity", sortOrder: 2 },
    ]
  );
  ids.push(id1);

  // Project without envelopes
  const id2 = await createProject(
    { ...SAMPLE_PROJECTS[1], hasEnvelopes: false, status: SAMPLE_PROJECTS[1].status as "submitted" }
  );
  ids.push(id2);

  return ids;
}
