const calcBtn = document.getElementById('calculateAge');
const birthdateInput = document.getElementById('birthdate');
const ageResult = document.getElementById('ageResult');

calcBtn.addEventListener('click', () => {
  const birthdateValue = birthdateInput.value;
  if (!birthdateValue) {
    ageResult.textContent = 'Please select a valid birthdate.';
    return;
  }

  const birthDate = new Date(birthdateValue);
  const today = new Date();

  if (birthDate > today) {
    ageResult.textContent = 'Birthdate cannot be in the future.';
    return;
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  ageResult.textContent = `Your age is ${age} year${age !== 1 ? 's' : ''}.`;
});
