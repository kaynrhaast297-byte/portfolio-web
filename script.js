const projectsBtn = document.getElementById("btn-projects");
const contactForm = document.getElementById("contact-form");
const formStatus = document.getElementById("form-status");

if (projectsBtn) {
  projectsBtn.addEventListener("click", () => {
    const target = document.getElementById("projetos");
    if (target) target.scrollIntoView({ behavior: "smooth" });
  });
}

if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    // Aqui você integraria com um backend ou serviço de email
    if (formStatus) {
      formStatus.style.display = "block";
      formStatus.textContent = "Mensagem enviada — obrigado!";
    } else {
      window.alert("Mensagem enviada — obrigado!");
    }
    contactForm.reset();
  });
}