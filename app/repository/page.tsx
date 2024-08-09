'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { ScrollArea } from "../../components/ui/scroll-area";
import { GitHubRepository } from "../../components/github-repository";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card";
import { Repository } from '@/lib/data/repository';

export default function RepositoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [repositories, setRepositories] = useState<Repository[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      console.log("Unauthenticated");
      router.replace("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      // Fetch repositories data here
      // For now, we'll use the mock data
      setRepositories([
        {
          id: 1,
          name: 'Open Source Repository 1',
          description: 'Description...',
          html_url: 'https://github.com/user/repo1', 
          star_count: 1000,
          language: 'JavaScript',
          owner: { login: 'company' },
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
  }, [session]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null; // This prevents any flash of content before redirect
  }

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