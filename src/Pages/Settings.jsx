import React from "react";
import { Container } from "react-bootstrap";
import UserSettingsForm from "../Components/UserSettingsForm";

const Settings = () => {
  return (
    <Container className="mt-4">
      <h2>🔧 User Settings</h2>
      <UserSettingsForm />
    </Container>
  );
};

export default Settings;
