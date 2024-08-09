'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { ScrollArea } from "../../components/ui/scroll-area";
import { GitHubRepository as GitHubRepositoryComponent } from "../../components/github-repository";
import { Repository as GitHubRepository } from '@/lib/data/repository';

interface Skill {
  name: string;
  level: string;
}

interface Interest {
  name: string;
}

export default function GitHubData() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      console.log("Unauthenticated");
      router.replace("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      setSkills([
        { name: 'JavaScript', level: 'Beginner' },
        { name: 'React', level: 'Intermediate' },
        { name: 'Next.js', level: 'Advanced' },
      ]);
      setInterests([
        { name: 'Web Development' },
        { name: 'Machine Learning' },
        { name: 'Open Source' },
      ]);
      // Fetch data using GitHub API and user auth token
      setRepositories([
        {
          id: 1, 
          name: 'repository-1',
          description: 'Project description...',
          html_url: 'https://github.com/user/repository-1',
          star_count: 0,
          language: 'JavaScript',
          owner: { login: 'github-username' },
          updated_at: '2024-08-07',
        },
        {
          id: 2,
          name: 'repository-2',
          description: 'Project description...',
          html_url: 'https://github.com/user/project-2',
          star_count: 0,
          language: 'JavaScript',
          owner: { login: 'github-username' },
          updated_at: '2024-08-07',
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
      <div className="space-y-6">
        {/* <Card>
          <CardHeader>
            <CardTitle>Skills</CardTitle>
            <CardDescription>Your programming skills</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <Badge key={index} variant="secondary">
                  {skill.name} - {skill.level}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interests</CardTitle>
            <CardDescription>Your areas of interest</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest, index) => (
                <Badge key={index} variant="outline">
                  {interest.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card> */}

        {/* Add option to revoke GitHUb repository access */}
        <Card>
          <CardHeader>
            <CardTitle>Connected Repositories</CardTitle>
            <CardDescription>Your GitHub repositories</CardDescription>
          </CardHeader>
          <CardContent>
            <GitHubRepositoryComponent repositories={repositories} />
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};