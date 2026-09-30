export type ProfileAnswers = {
  displayName: string;
  program: string;
  yearLabel: string;
  bio: string;
  discoverable: boolean;
};

export function validateProfileAnswers(answers: ProfileAnswers, verifiedEmail: string | undefined) {
  const displayName = answers.displayName.trim().replace(/\s+/g, ' ');
  const program = answers.program.trim().replace(/\s+/g, ' ');
  const yearLabel = answers.yearLabel.trim();
  const bio = answers.bio.trim();
  if (displayName.length < 2 || displayName.length > 80) throw new Error('Enter your name (2–80 characters).');
  if (program.length < 2 || program.length > 120) throw new Error('Enter your program (2–120 characters).');
  if (yearLabel.length > 40) throw new Error('Choose a year of study.');
  if (bio.length > 500) throw new Error('Keep your introduction under 500 characters.');
  if (answers.discoverable && !verifiedEmail) throw new Error('A verified email is needed to make your profile discoverable.');
  return {
    display_name: displayName,
    program,
    year_label: yearLabel,
    bio,
    is_discoverable: answers.discoverable,
    contact_email: answers.discoverable ? verifiedEmail!.toLowerCase() : null,
  };
}
