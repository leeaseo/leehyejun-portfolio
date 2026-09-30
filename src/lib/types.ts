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
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string[];
  honors?: ResumeHonor[];
  certifications?: string[];
  resumePdf: string;
}

export interface WorkProject {
  title: string;
  slug: string;
  date: string;
  thumbnail: string;
  images: string[];
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
