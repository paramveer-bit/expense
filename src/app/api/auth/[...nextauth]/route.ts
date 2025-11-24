// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import type { NextAuthOptions, User, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import db from "@/lib/dbConnect";
import { verifyPassword } from "@/lib/auth";
import type { JWT } from "next-auth/jwt";
import UserModel from "@/models/user.model";
export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text", placeholder: "you@example.com" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials) return null;
                const { email, password } = credentials;
                await db();

                let res = null
                try {
                    res = await UserModel.findOne({ email: email.toLowerCase() });

                } catch (error) {
                    console.log("Error in finding user" + error);
                    return null;
                }
                if (!res) return null;


                console.log("Found user for auth:", res);
                const isValid = await verifyPassword(password, res.password);
                if (!isValid) return null;
                const user = res;
                return {
                    id: String(user._id),
                    name: user.username,
                    email: user.email,
                } as User;
            },
        }),
    ],
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    callbacks: {
        // jwt callback: token and optional user
        async jwt({ token, user }: { token: JWT; user?: User | undefined }): Promise<JWT> {
            if (user && (user as any).id) {
                token.id = (user as any).id;
            }
            return token;
        },

        // session callback: attaches token.id to session.user.id
        async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
            if (token && session.user) {
                // token.id may be undefined, so keep it optional
                (session.user as any).id = token.id as string | undefined;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
