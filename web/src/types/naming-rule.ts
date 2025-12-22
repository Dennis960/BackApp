export interface NamingRule {
  id: number;
  name: string;
  pattern: string;
  created_at: string;
}

export interface NamingRuleCreateInput {
  name: string;
  pattern: string;
}
