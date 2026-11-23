import { API } from "./config";
import './App.css';
import { useEffect, useState } from "react";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import {
  IconPhone,
  IconMessageCircle,
  IconMapPin,
  IconMenu,
  IconX,
  IconChevronUp,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconCopy,
  IconMaximize,
  IconLayers,
  IconShield,
  IconGrid,
  IconActivity,
  IconWrench,
  IconServer,
  IconLock,
} from "./components/Icons";

const CURRENT_YEAR = new Date().getFullYear();

function App() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  // Lightbox for customer viewing project gallery
  const [publicLightbox, setPublicLightbox] = useState({
    isOpen: false,
    images: [],
    currentIndex: 0,
    title: "",
  });

  const navigateToSection = (sectionId) => {
    setMobileMenuOpen(false);
    const target = document.getElementById(sectionId);
    const navbar = document.querySelector(".navbar");

    if (!target || !navbar) return;

    if (sectionId === "home") {
      window.history.pushState(null, "", "#home");
      setActiveSection("home");
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    const currentNavbarHeight = navbar.getBoundingClientRect().height;
    const heightDifference = window.innerWidth <= 768 ? 16 : 24;
    const targetNavbarHeight = navbar.classList.contains("navbar-scrolled")
      ? currentNavbarHeight
      : currentNavbarHeight - heightDifference;

    const targetPosition =
      target.getBoundingClientRect().top + window.scrollY - targetNavbarHeight;

    window.history.pushState(null, "", `#${sectionId}`);
    setActiveSection(sectionId);

    window.scrollTo({
      top: targetPosition,
      behavior: "smooth",
    });
  };

  const copyPhoneNumber = () => {
    navigator.clipboard.writeText("+919244420993");
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  // Fetch projects from backend
  useEffect(() => {
    fetch(`${API}/projects`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setProjects(data.projects);
        }
      })
      .catch((error) => {
        console.error("Error fetching projects:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Reveal animation for page elements
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          } else {
            entry.target.classList.remove("is-visible");
          }
        });
      },
      { threshold: 0.15 }
    );

    const elements = document.querySelectorAll(".reveal");
    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [projects]);

  // Scroll listeners: compact navbar & back to top button
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
      setShowBackToTop(window.scrollY > 400);

      const navbar = document.querySelector(".navbar");
      const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 0;
      const sections = ["home", "about", "services", "projects", "contact"];
      let currentSection = "home";

      sections.forEach((sectionId) => {
        const section = document.getElementById(sectionId);
        if (section && section.getBoundingClientRect().top <= navbarHeight + 10) {
          currentSection = sectionId;
        }
      });

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10) {
        currentSection = "contact";
      }

      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && publicLightbox.isOpen) {
        setPublicLightbox((prev) => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [publicLightbox.isOpen]);

  // Admin routes
  if (window.location.pathname === "/admin/dashboard") {
    return <AdminDashboard />;
  }

  if (window.location.pathname === "/admin") {
    return <AdminLogin />;
  }

  const visibleProjects = projects.filter(
    (project) => project.images && project.images.length > 0
  );

  return (
    <>
      {/* Navigation Bar */}
      <nav className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
        <div className="navbar-brand-wrap" onClick={() => navigateToSection("home")} style={{ cursor: "pointer" }}>
          <h2 className="logo">
            DB <span>METAL FABRICATION.</span>
          </h2>
        </div>

        {/* Desktop Navigation Links */}
        <div className="nav-links">
          <a
            href="#home"
            className={activeSection === "home" ? "active" : ""}
            onClick={(e) => {
              e.preventDefault();
              navigateToSection("home");
            }}
          >
            Home
          </a>

          <a
            href="#about"
            className={activeSection === "about" ? "active" : ""}
            onClick={(e) => {
              e.preventDefault();
              navigateToSection("about");
            }}
          >
            About
          </a>

          <a
            href="#services"
            className={activeSection === "services" ? "active" : ""}
            onClick={(e) => {
              e.preventDefault();
              navigateToSection("services");
            }}
          >
            Services
          </a>

          <a
            href="#projects"
            className={activeSection === "projects" ? "active" : ""}
            onClick={(e) => {
              e.preventDefault();
              navigateToSection("projects");
            }}
          >
            Projects
          </a>

          <a
            href="#contact"
            className={activeSection === "contact" ? "active" : ""}
            onClick={(e) => {
              e.preventDefault();
              navigateToSection("contact");
            }}
          >
            Contact
          </a>


        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <IconX size={24} /> : <IconMenu size={24} />}
        </button>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer" onClick={() => setMobileMenuOpen(false)}>
          <div className="drawer-inner" onClick={(e) => e.stopPropagation()}>
            <a
              href="#home"
              className={activeSection === "home" ? "active" : ""}
              onClick={(e) => {
                e.preventDefault();
                navigateToSection("home");
              }}
            >
              Home
            </a>
            <a
              href="#about"
              className={activeSection === "about" ? "active" : ""}
              onClick={(e) => {
                e.preventDefault();
                navigateToSection("about");
              }}
            >
              About Us
            </a>
            <a
              href="#services"
              className={activeSection === "services" ? "active" : ""}
              onClick={(e) => {
                e.preventDefault();
                navigateToSection("services");
              }}
            >
              Our Services
            </a>
            <a
              href="#projects"
              className={activeSection === "projects" ? "active" : ""}
              onClick={(e) => {
                e.preventDefault();
                navigateToSection("projects");
              }}
            >
              Recent Projects
            </a>
            <a
              href="#contact"
              className={activeSection === "contact" ? "active" : ""}
              onClick={(e) => {
                e.preventDefault();
                navigateToSection("contact");
              }}
            >
              Contact Us
            </a>

            <div className="drawer-contact-shortcuts">
              <a
                href="#contact"
                className="drawer-call-btn"
                onClick={(e) => {
                  e.preventDefault();
                  setShowPhone(true);
                  navigateToSection("contact");
                }}
              >
                <IconPhone size={16} />
                <span>Call Us</span>
              </a>
              <a
                href="https://wa.me/919244420993?text=Hello%2C%20I%20am%20interested%20in%20your%20metal%20fabrication%20services."
                className="drawer-wa-btn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconMessageCircle size={16} />
                <span>WhatsApp Enquiry</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero-section" id="home">
        <div className="hero-content">
          <p className="tagline">METAL FABRICATOR</p>

          <h1>
  Metal Fabrication
  <br />
  <span>in Coimbatore</span>
</h1>

        <p className="description">
  Structural Works • Gates • Grills • Staircases
  <br />
  CNC Machine Erection • On-site Works | Coimbatore, Tamil Nadu
</p>

          <div className="hero-buttons">
            <a
              href="#services"
              className="primary-btn"
              onClick={(e) => {
                e.preventDefault();
                navigateToSection("services");
              }}
            >
              Explore Services
            </a>

            <a
              href="#contact"
              className="secondary-btn"
              onClick={(e) => {
                e.preventDefault();
                navigateToSection("contact");
              }}
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section" id="about">
        <div className="about-content">
          <div className="about-image reveal reveal-left">
            <div className="image-overlay">
              <span>DB METAL FABRICATION</span>
              <h3>
                Built with Strength.
                <br />
                Made with Precision.
              </h3>
            </div>
          </div>

          <div className="about-text reveal reveal-right">
            <p className="section-label">ABOUT OUR BUSINESS</p>

            <h2>
  Experienced Metal Fabrication
  <span> Services in Coimbatore</span>
</h2>

            <p>
              DB Metal Fabrication, based in Coimbatore, Tamil Nadu, 
              brings over 30 years of industry experience in
              delivering metal fabrication and structural solutions, backed by a
              strong commitment to quality, precision, and professional workmanship.
            </p>

            <p>
              Our range of services includes heavy structural works, custom gates,
              metal grills, and staircases, with every project undertaken in accordance
              with specific customer requirements and industry standards.
            </p>

            <p>
              We undertake on-site fabrication, welding, and CNC machine erection works,
              backed by three decades of technical expertise and a steadfast dedication
              to dependable results in every project.
            </p>

            <a
              href="#contact"
              className="primary-btn"
              onClick={(e) => {
                e.preventDefault();
                setShowPhone(true);
                navigateToSection("contact");
              }}
            >
              Discuss Your Project
            </a>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section" id="services">
        <div className="services-heading">
          <p className="section-label">WHAT WE SPECIALIZE IN</p>
          <h2>Our <span>Services</span></h2>
          <p>
  From industrial shed fabrication and heavy structural steel works
  to custom gates, grills, staircases and CNC machine erection,
  we deliver reliable metal fabrication solutions in Coimbatore
  and surrounding areas.
</p>
        </div>

        <div className="service-container">
          <div className="service-card reveal">
            <div className="service-card-top">
              <span className="service-number">01</span>
              <div className="service-icon-box">
                <IconLayers size={22} />
              </div>
            </div>
            <h3>Heavy Structural Works</h3>
            <p>
  Industrial shed and godown fabrication, warehouse structures,
  steel trusses, and heavy structural frameworks designed for
  strength, durability, and reliable long-term use.
</p>
            <a
              href="#contact"
              className="service-enquire-link"
              onClick={(e) => {
                e.preventDefault();
                setShowPhone(true);
                navigateToSection("contact");
              }}
            >
              Enquire Work →
            </a>
          </div>

          <div className="service-card reveal">
            <div className="service-card-top">
              <span className="service-number">02</span>
              <div className="service-icon-box">
                <IconShield size={22} />
              </div>
            </div>
            <h3>Custom Gates</h3>
            <p>
              Custom-fabricated sliding, swing, and ornamental security gates
              designed for longevity, maximum strength, and aesthetic appeal.
            </p>
            <a
              href="#contact"
              className="service-enquire-link"
              onClick={(e) => {
                e.preventDefault();
                setShowPhone(true);
                navigateToSection("contact");
              }}
            >
              Enquire Work →
            </a>
          </div>

          <div className="service-card reveal">
            <div className="service-card-top">
              <span className="service-number">03</span>
              <div className="service-icon-box">
                <IconGrid size={22} />
              </div>
            </div>
            <h3>Metal Grills</h3>
            <p>
              Quality metal grills, safety enclosures, and decorative window
              screens fabricated to precise measurements and architectural themes.
            </p>
            <a
              href="#contact"
              className="service-enquire-link"
              onClick={(e) => {
                e.preventDefault();
                setShowPhone(true);
                navigateToSection("contact");
              }}
            >
              Enquire Work →
            </a>
          </div>

          <div className="service-card reveal">
            <div className="service-card-top">
              <span className="service-number">04</span>
              <div className="service-icon-box">
                <IconActivity size={22} />
              </div>
            </div>
            <h3>Steel Staircases</h3>
            <p>
              Practical, heavy-duty industrial spiral and straight steel staircases,
              catwalks, and safety handrails for diverse spaces.
            </p>
            <a
              href="#contact"
              className="service-enquire-link"
              onClick={(e) => {
                e.preventDefault();
                setShowPhone(true);
                navigateToSection("contact");
              }}
            >
              Enquire Work →
            </a>
          </div>

          <div className="service-card reveal">
            <div className="service-card-top">
              <span className="service-number">05</span>
              <div className="service-icon-box">
                <IconWrench size={22} />
              </div>
            </div>
            <h3>On-site Works</h3>
            <p>
  Professional on-site metal fabrication, welding, structural
  assembly, repairs and modifications carried out at customer
  locations across Coimbatore and surrounding areas.
</p>
            <a
              href="#contact"
              className="service-enquire-link"
              onClick={(e) => {
                e.preventDefault();
                setShowPhone(true);
                navigateToSection("contact");
              }}
            >
              Enquire Work →
            </a>
          </div>

          <div className="service-card reveal">
            <div className="service-card-top">
              <span className="service-number">06</span>
              <div className="service-icon-box">
                <IconServer size={22} />
              </div>
            </div>
            <h3>CNC Machine Erection</h3>
            <p>
  On-site erection, positioning, alignment and installation
  of CNC cutting machines, ensuring accurate setup and
  dependable operation through experienced workmanship.
</p>
            <a
              href="#contact"
              className="service-enquire-link"
              onClick={(e) => {
                e.preventDefault();
                setShowPhone(true);
                navigateToSection("contact");
              }}
            >
              Enquire Work →
            </a>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="projects-section" id="projects">
        <div className="projects-heading">
          <div>
            <p className="section-label">OUR WORK</p>
            <h2>Projects We've <span>Built</span></h2>
            <p>
              A glimpse of our recent metal fabrication, structural works, and
              custom installations.
            </p>
          </div>

          <a
            href="#contact"
            className="project-link"
            onClick={(e) => {
              e.preventDefault();
              setShowPhone(true);
              navigateToSection("contact");
            }}
          >
            Start Your Project →
          </a>
        </div>

        {loading ? (
          <div className="projects-loading-spinner">
            <div className="spinner-dot"></div>
            <p>Loading projects gallery...</p>
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="no-projects-box">
            <p>Portfolio gallery is being updated with fresh project photographs.</p>
          </div>
        ) : (
          <div className="projects-grid">
            {visibleProjects.map((project) => (
              <div className="project-card reveal" key={project.id}>
                <div className="project-card-gallery">
                  {project.images.map((image, idx) => (
                    <div
                      key={image.id}
                      className="project-image-slide"
                      onClick={() =>
                        setPublicLightbox({
                          isOpen: true,
                          images: project.images,
                          currentIndex: idx,
                          title: project.description,
                        })
                      }
                      title="Click to view full photo"
                    >
                      <img
                        src={image.image_url}
                        alt={project.description}
                        loading="lazy"
                      />
                      <div className="project-zoom-overlay">
                        <IconMaximize size={16} />
                        <span>View</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="project-info">
                  <div className="project-tag-row">
                    <span>OUR WORK</span>
                    <span className="project-photos-count">
                      {project.images.length} {project.images.length === 1 ? "Photo" : "Photos"}
                    </span>
                  </div>
                  <h3>{project.description}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Contact Section */}
      <section className="contact" id="contact">
        <div className="contact-content reveal reveal-left">
          <p className="section-tag">GET IN TOUCH</p>

          <h2>Let's Build Something Strong Together.</h2>

          <p className="contact-description">
            Looking for reliable metal fabrication work? Contact DB Metal
            Fabrication for your requirements. We undertake heavy structural works,
            gates, grills, staircases, CNC machine erection, and on-site works across
            Tamil Nadu.
          </p>

          {/* Interactive Call & Contact Action Area */}
          <div className="contact-actions-area">
            {!showPhone ? (
              <button
                type="button"
                className="contact-btn call-btn reveal-call-btn"
                onClick={() => {
                  setShowPhone(true);
                  if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
                    window.location.href = "tel:+919244420993";
                  }
                }}
              >
                <IconPhone size={16} />
                <span>Call Now</span>
              </button>
            ) : (
              <div className="revealed-phone-card">
                <a
                  href="tel:+919244420993"
                  className="contact-btn call-btn phone-direct-dial"
                  title="Click to call +91 92444 20993"
                >
                  <IconPhone size={16} />
                  <span>+91 92444 20993</span>
                  <span className="tap-to-call-pill">Click to Call</span>
                </a>

                <button
                  type="button"
                  className="btn-copy-revealed-phone"
                  onClick={copyPhoneNumber}
                  title="Copy phone number"
                >
                  {copiedPhone ? (
                    <>
                      <IconCheck size={14} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <IconCopy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <a
              href="https://wa.me/919244420993?text=Hello%2C%20I%20am%20interested%20in%20your%20metal%20fabrication%20services."
              className="contact-btn whatsapp-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconMessageCircle size={16} />
              <span>WhatsApp Enquiry</span>
            </a>
          </div>
        </div>

        <div className="contact-side reveal reveal-right">
          <span className="contact-number">DB</span>
          <h3>DB Metal Fabrication</h3>
          <h5>Metal Fabricator </h5>
          <div className="contact-line"></div>
          <p className="highlight-pill">Heavy Structural Works</p>
          <p>Gates • Grills • Staircases</p>
          <p>CNC Machine Erection • On-site Works</p>
          <div className="contact-location-note">
            <IconMapPin size={15} />
            <span>On-site execution undertaken across the region</span>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="footer">
        <div className="footer-main">
          <div className="footer-brand">
            <h2>
              DB <span>METAL FABRICATION</span>
            </h2>

            <p>
              Metal Fabricator based in Coimbatore, 
              specializing in heavy structural works, 
              CNC machine erection, gates, grills, staircases, 
              and on-site works across Tamil Nadu. 
              Delivering dependable durability for three decades.
            </p>

            <a
              href="https://www.instagram.com/siva_kumar631/"
              target="_blank"
              rel="noopener noreferrer"
              className="instagram-link"
            >
              <span>◎</span> Follow us on Instagram
            </a>
          </div>

          <div className="footer-links">
            <h3>Quick Links</h3>
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                navigateToSection("home");
              }}
            >
              Home
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                navigateToSection("about");
              }}
            >
              About Business
            </a>
            <a
              href="#services"
              onClick={(e) => {
                e.preventDefault();
                navigateToSection("services");
              }}
            >
              Our Services
            </a>
            <a
              href="#projects"
              onClick={(e) => {
                e.preventDefault();
                navigateToSection("projects");
              }}
            >
              Projects Gallery
            </a>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                setShowPhone(true);
                navigateToSection("contact");
              }}
            >
              Contact Us
            </a>
          </div>

          <div className="footer-services">
            <h3>Our Specialization</h3>
            <p>Heavy Structural Works</p>
            <p>Custom Gates & Grills</p>
            <p>Steel Staircases</p>
            <p>CNC Machine Erection</p>
            <p>On-site Mobile Fabrication</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {CURRENT_YEAR} DB Metal Fabrication, Coimbatore, Tamil Nadu. All Rights Reserved.
          </p>

        </div>
      </footer>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          className="back-to-top-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="Back to top"
          aria-label="Back to top"
        >
          <IconChevronUp size={20} />
        </button>
      )}

      {/* Sticky Bottom Mobile Bar */}
      <div className="mobile-sticky-bar">
        <button
          type="button"
          className="mobile-bar-btn call"
          onClick={() => {
            setShowPhone(true);
            navigateToSection("contact");
            if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
              window.location.href = "tel:+919244420993";
            }
          }}
        >
          <IconPhone size={16} />
          <span>Call Now</span>
        </button>
        <a
          href="https://wa.me/919244420993?text=Hello%2C%20I%20am%20interested%20in%20your%20metal%20fabrication%20services."
          className="mobile-bar-btn whatsapp"
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconMessageCircle size={16} />
          <span>WhatsApp</span>
        </a>
      </div>

      {/* Customer Fullscreen Lightbox Modal */}
      {publicLightbox.isOpen && publicLightbox.images.length > 0 && (
        <div
          className="public-lightbox-overlay"
          onClick={() => setPublicLightbox((prev) => ({ ...prev, isOpen: false }))}
        >
          <div className="public-lightbox-header" onClick={(e) => e.stopPropagation()}>
            <div className="public-lightbox-info">
              <span className="lightbox-photo-counter">
                Photo {publicLightbox.currentIndex + 1} of {publicLightbox.images.length}
              </span>
              <h4>{publicLightbox.title}</h4>
            </div>

            <button
              type="button"
              className="public-lightbox-close"
              onClick={() => setPublicLightbox((prev) => ({ ...prev, isOpen: false }))}
              title="Close (Esc)"
            >
              <IconX size={20} />
            </button>
          </div>

          {publicLightbox.images.length > 1 && (
            <>
              <button
                type="button"
                className="public-lightbox-arrow arrow-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  setPublicLightbox((prev) => ({
                    ...prev,
                    currentIndex:
                      (prev.currentIndex - 1 + prev.images.length) % prev.images.length,
                  }));
                }}
                title="Previous photo"
              >
                <IconChevronLeft size={28} />
              </button>
              <button
                type="button"
                className="public-lightbox-arrow arrow-next"
                onClick={(e) => {
                  e.stopPropagation();
                  setPublicLightbox((prev) => ({
                    ...prev,
                    currentIndex:
                      (prev.currentIndex + 1) % prev.images.length,
                  }));
                }}
                title="Next photo"
              >
                <IconChevronRight size={28} />
              </button>
            </>
          )}

          <div className="public-lightbox-img-stage" onClick={(e) => e.stopPropagation()}>
            <img
              src={publicLightbox.images[publicLightbox.currentIndex]?.image_url}
              alt={publicLightbox.title}
              className="public-lightbox-main-img"
            />
          </div>
        </div>
      )}
    </>
  );
}

export default App;
