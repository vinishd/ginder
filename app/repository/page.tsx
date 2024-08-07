'use client';

import React, { useState, useEffect } from 'react';
import { ScrollArea } from "../../components/ui/scroll-area";
import { GitHubRepository } from "../../components/github-repository";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Repository } from '@/lib/data/repository';

export default function Home() {
  const [repositories, setRepositories] = useState<Repository[]>([]);

  useEffect(() => {
    function fetchRepositories() {
      setRepositories([
        {
          id: 1,
          name: 'Open Source Repository 2',
          description: 'Description...',
          html_url: 'https://github.com/user/repo1', 
          star_count: 1000,
          language: 'JavaScript',
          owner: { login: 'company' }, // remove owner, not needed for saved repositories. 
          updated_at: '2024-08-07',
          issues_count: 1
        },
        {
          id: 2,
          name: 'Open Source Repository 2',
          description: 'Description...',
          html_url: 'https://github.com/user/repo2',
          star_count: 1000,
          language: 'TypeScript',
          owner: { login: 'company' },
          updated_at: '2024-08-07',
          issues_count: 2
        },
      ]);
    }

    fetchRepositories();
  }, []);

  return (
    <ScrollArea className="h-[calc(100vh-4rem)] p-4">
      <Card>
        <CardHeader>
          <CardTitle>Subscribed Repositories</CardTitle>
          <CardDescription>Your saved Open Source repositories</CardDescription>
        </CardHeader>
        <CardContent>
          <GitHubRepository repositories={repositories} />
        </CardContent>
      </Card>
    </ScrollArea>
  );
}