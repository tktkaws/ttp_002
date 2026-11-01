export interface NavItem {
  href: string;
  label: string;
}

export interface SectionContent {
  id: string;
  number: string;
  title: string;
}

export interface DescriptionItem {
  label: string;
  description: string;
}

export interface StrengthItem {
  label: string;
  lines: string[];
}

export interface TextCardItem extends DescriptionItem {
  color?: string;
  textColor?: string;
  image?: string;
  imageLayout?: "inset" | "full";
  href?: string;
}
