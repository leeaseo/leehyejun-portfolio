export interface ContactInfo {
  email: string;
  instagram: string;
  linkedin: string;
  github: string;
}

export interface AboutData {
  name: string;
  role: string;
  location: string;
  bio: string;
  profileImage: string;
  contact: ContactInfo;
}

export interface ResumeExperience {
  company: string;
  role: string;
  period: string;
  description?: string;
  tasks?: string[];
}

export interface ResumeEducation {
  school: string;
  major: string;
  period: string;
}

export interface ResumeHonor {
  title: string;
  period: string;
}

export interface ResumeData {
  totalExperience?: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string[];
  honors?: ResumeHonor[];
  certifications?: string[];
  resumePdf: string;
}

export interface ProcessStepItem {
  step: string;
  title: string;
  description: string;
  image?: string;
}

export interface ContributionPhase {
  label: string;
  percent: number;
  note?: string;
}

export interface ProjectContribution {
  totalPercent?: string;
  role?: string;
  phases?: ContributionPhase[];
}

export interface MoreProcessBlock {
  id?: string;
  title?: string;
  images: string[];
  description: string;
}

export interface WorkProject {
  title: string;
  slug: string;
  date: string;
  brand?: string;
  thumbnail: string;
  images: string[];
  processImages?: string[];
  processSteps?: ProcessStepItem[];
  contribution?: ProjectContribution;
  moreBlocks?: MoreProcessBlock[];
  materials: string;
  dimensions: string;
  externalUrl?: string;
  order: number;
  content: string;
}

export interface PostAttachment {
  name: string;
  path: string;
  size?: string;
}

export interface PostItem {
  title: string;
  slug: string;
  date: string;
  category: string;
  excerpt: string;
  attachments?: PostAttachment[];
  content: string;
}

export type NavTab = 'about' | 'resume' | 'work' | 'more';
