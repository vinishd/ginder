export interface Repository {
    id: number;
    name: string;
    description: string;
    html_url: string;
    star_count: number;
    language: string;
    owner: {
      login: string;
    };
    updated_at: string;
    issues_count?: number;
  }