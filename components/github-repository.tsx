import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import StarIcon from '@mui/icons-material/Star';
import { Repository } from '@/lib/data/repository';

interface GitHubRepositoryProps {
  repositories: Repository[];
}

export function GitHubRepository({ repositories }: GitHubRepositoryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {repositories.map((repo) => (
        <Card key={repo.id} className="flex flex-col bg-black text-white dark:bg-white dark:text-black">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {repo.owner.login}/{repo.name}
              </a>
            </CardTitle>
            <CardDescription className="text-gray-300 dark:text-gray-700">{repo.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-2">
            <div className="flex items-center text-sm space-x-4">
              {repo.language && (
                <span className="flex items-center">
                  <span className="w-3 h-3 rounded-full mr-1 bg-gray-400 dark:bg-gray-600"></span>
                  {repo.language}
                </span>
              )}
              {repo.star_count !== undefined && (
                <span className="flex items-center">
                  <StarIcon className="w-4 h-4 mr-1" />
                  {repo.star_count.toLocaleString()}
                </span>
              )}
              <span>  
                Last edit at {repo.updated_at}
              </span>
            </div>
            {repo.issues_count && (
              <a href={`${repo.html_url}/issues`} target="_blank" rel="noopener noreferrer">
                <Badge variant="secondary" className="bg-gray-700 text-gray-200 dark:bg-gray-200 dark:text-gray-800 hover:bg-gray-600 dark:hover:bg-gray-300">
                  {repo.issues_count} {repo.issues_count === 1 ? 'issue' : 'issues'}
                </Badge>
              </a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};