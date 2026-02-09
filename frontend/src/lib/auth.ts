import { NextAuthOptions } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import CredentialsProvider from "next-auth/providers/credentials";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
    adapter: DrizzleAdapter(db),
    session: { strategy: "jwt" },
    providers: [
        CredentialsProvider({
            name: "Demo Login",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "demo@axiom.com" },
                password: { label: "Password (any)", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email) return null;

                // Check if user exists
                const existingUser = await db.query.users.findFirst({
                    where: eq(users.email, credentials.email)
                });

                if (existingUser) {
                    return {
                        id: existingUser.id,
                        email: existingUser.email,
                        name: existingUser.name,
                        image: existingUser.image,
                    };
                }

                // Create new demo user
                try {
                    const [newUser] = await db.insert(users).values({
                        email: credentials.email,
                        name: "Demo User",
                        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${credentials.email}`,
                        emailVerified: new Date(),
                    }).returning();

                    return {
                        id: newUser.id,
                        email: newUser.email,
                        name: newUser.name,
                        image: newUser.image,
                    };
                } catch (error) {
                    console.error("Error creating user:", error);
                    return null;
                }
            }
        })
    ],
    callbacks: {
        async session({ session, token }) {
            if (session?.user && token.sub) {
                session.user.id = token.sub;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
            }
            return token;
        }
    },

};
