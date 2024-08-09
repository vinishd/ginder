import { getServerSession } from "next-auth/next";
import { options } from "../auth/[...nextauth]/option";
import { NextResponse } from "next/server";
import {NextAuthOptions} from 'next-auth'

interface User {
    id: number
    githubToken?: string
    githubId: string
    email: string
    username: string
}

export async function POST() {
    const session = await getServerSession<NextAuthOptions>(options);

    if (!session || !session.accessToken || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(session);

    // Create user, return userId (email identifier)
    // TODO: Send userId (name) to /user
    const user_response = await fetch(`${process.env.WORKER_URL}/users`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.APP_SECRET}`,
        },
        body: JSON.stringify({
            githubToken: session.accessToken,
            username: session.user.name,
            email: session.user.email,
            githubId: session.username!,
        }),
    });
    if (!user_response.ok) {
        // TODO: do something
    }

    // userId (email identifier) from user_response
    const process_user_response = await fetch(`${process.env.WORKERS_URL}/process-user`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.APP_SECRET}`,
        },
        body: JSON.stringify({
            githubToken: session.accessToken,
            userId: session.user.id,
        }),
    });

    if (!process_user_response.ok) {
        return NextResponse.json({ error: "Failed to initiate processing" }, { status: 500 });
    }
    
    return NextResponse.json({ message: "Processing initiated" });
}