"use client";

// Renders the Dock only on the client — it reads from localStorage so
// server and client would always disagree on initial state.
import dynamic from "next/dynamic";

export default dynamic(() => import("./(vault)/dock"), { ssr: false });
