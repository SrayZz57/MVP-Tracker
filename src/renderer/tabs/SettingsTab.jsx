import SettingsForm from '../SettingsForm.jsx';

function SettingsTab({ settings, onSaved }) {
  return <SettingsForm initialSettings={settings} onSaved={onSaved} />;
}

export default SettingsTab;
