// app/page.js
'use client';

import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  
  if (status === "loading") {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  
  if (session) {
    const userName = session.user?.name ?? "User";
    const userEmail = session.user?.email ?? "No email available";
    const userImage = session.user?.image ?? null;

    return (
      <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
        <h1>Welcome to My App 🎉</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "20px 0" }}>
          {userImage ? (
            <Image
              src={userImage}
              alt={userName}
              width={50}
              height={50}
              style={{ borderRadius: "50%" }}
            />
          ) : (
            <div
              style={{
                alignItems: "center",
                background: "#e5e7eb",
                borderRadius: "50%",
                color: "#111827",
                display: "flex",
                fontWeight: 700,
                height: "50px",
                justifyContent: "center",
                width: "50px",
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h3>{userName}</h3>
            <p style={{ color: "gray" }}>{userEmail}</p>
          </div>
        </div>
        <button 
          onClick={() => signOut()} 
          style={{ padding: "10px 20px", cursor: "pointer", background: "red", color: "white", border: "none", borderRadius: "5px" }}
        >
          Logout
        </button>
      </div>
    );
  }

  
  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", textAlign: "center" }}>
      <h1>Welcome Guest!</h1>
      <p>Please sign in to continue</p>
      <button 
        onClick={() => signIn("google")} 
        style={{ padding: "12px 24px", fontSize: "16px", cursor: "pointer", background: "#4285F4", color: "white", border: "none", borderRadius: "5px", marginTop: "20px" }}
      >
        Sign in with Google
      </button>
    </div>
  );
}
