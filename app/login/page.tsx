import React from "react";
import { useState } from "react";

const page = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div>
      <input
        type="text"
        placeholder="username"
        onChange={(event) => {
          setUsername(event.target.value);
        }}
        value={username}
      />
      <input
        type="password"
        placeholder="password"
        onChange={(event) => {
          setPassword(event.target.value);
        }}
        value={password}
      />
      <button>login</button>
    </div>
  );
};

export default page;
