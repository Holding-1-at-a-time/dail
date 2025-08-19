import React, { useState, useEffect } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { MenuIcon, XIcon, CheckCircleIcon, ChevronDownIcon, WrenchScrewdriverIcon, UsersIcon, CloudArrowUpIcon } from './icons';

// --- Reusable Components for the Landing Page ---

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="text-gray-300 hover:text-primary transition-colors duration-300">{children}</a>
);

const Section = ({ id, children, className = '' }: { id: string; children: React.ReactNode; className?: string }) => (
  <section id={id} className={`py-16 md:py-24 ${className}`}>
    <div className="container mx-auto px-4">{children}</div>
  </section>
);

const SectionTitle = ({ children, subtitle }: { children: React.ReactNode; subtitle: string }) => (
  <div className="text-center mb-12">
    <h2 className="text-3xl md:text-4xl font-bold text-white">{children}</h2>
    <p className="text-lg text-secondary mt-2">{subtitle}</p>
  </div>
);

// --- Page Sections ---

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { openSignIn } = useClerk();

  return (
    <header className="bg-gray-900 bg-opacity-80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          <a href="#" className="text-2xl font-bold text-white">Detailing <span className="text-primary">Pro</span></a>
          <nav className="hidden md:flex items-center space-x-6">
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#pricing">Pricing</NavLink>
            <NavLink href="#testimonials">Testimonials</NavLink>
            <NavLink href="#faq">FAQ</NavLink>
          </nav>
          <div className="hidden md:flex items-center space-x-4">
             <button onClick={() => openSignIn()} className="text-gray-300 hover:text-primary transition-colors">Sign In</button>
             <button onClick={() => openSignIn()} className="bg-primary text-white font-semibold px-5 py-2 rounded-lg hover:bg-opacity-90 transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-neon-primary">Get Started</button>
          </div>
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-white">
              {isOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {/* Mobile Menu */}
        {isOpen && (
            <div className="md:hidden pb-4 space-y-4">
                <nav className="flex flex-col items-center space-y-4">
                    <NavLink href="#features">Features</NavLink>
                    <NavLink href="#pricing">Pricing</NavLink>
                    <NavLink href="#testimonials">Testimonials</NavLink>
                    <NavLink href="#faq">FAQ</NavLink>
                </nav>
                <div className="flex flex-col items-center space-y-4 pt-4 border-t border-gray-700">
                    <button onClick={() => openSignIn()} className="w-full text-center text-gray-300 hover:text-primary transition-colors py-2">Sign In</button>
                    <button onClick={() => openSignIn()} className="w-full text-center bg-primary text-white font-semibold px-5 py-2 rounded-lg hover:bg-opacity-90 transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-neon-primary">Get Started</button>
                </div>
            </div>
        )}
      </div>
    </header>
  );
};

const HeroSection = () => {
    const { openSignIn } = useClerk();
    return (
        <Section id="home" className="text-center bg-gray-900">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4">
                The Ultimate OS for Your<br />
                <span className="text-primary">Auto Detailing Business</span>
            </h1>
            <p className="text-lg md:text-xl text-secondary max-w-3xl mx-auto mb-8">
                From scheduling and estimates to invoicing and inventory, Detailing Pro is the all-in-one platform designed to streamline your operations and drive your growth.
            </p>
            <button onClick={() => openSignIn()} className="bg-primary text-white font-bold text-lg px-8 py-4 rounded-lg hover:bg-opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-primary/30 hover:shadow-neon-primary">
                Start Your Free Trial
            </button>
        </Section>
    );
};

const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div className="bg-gray-800 p-8 rounded-xl shadow-lg transform hover:-translate-y-2 transition-transform duration-300">
        <div className="text-primary mb-4">{icon}</div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-secondary">{children}</p>
    </div>
);


const FeaturesSection = () => (
    <Section id="features" className="bg-gray-800">
        <SectionTitle subtitle="Everything you need to run your business efficiently.">Core Features</SectionTitle>
        <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard icon={<WrenchScrewdriverIcon className="w-10 h-10" />} title="Job & Workflow Management">
                Effortlessly move from estimate to work order to invoice. Track job progress with checklists and capture photo documentation.
            </FeatureCard>
            <FeatureCard icon={<UsersIcon className="w-10 h-10" />} title="Team & Customer Hub (CRM)">
                Manage your technicians, roles, and schedules. Keep a complete history of your customers and their vehicles in one place.
            </FeatureCard>
             <FeatureCard icon={<CloudArrowUpIcon className="w-10 h-10" />} title="AI-Powered Efficiency">
                Leverage Gemini AI to generate service descriptions, suggest optimal appointment times, and even create marketing campaigns.
            </FeatureCard>
        </div>
    </Section>
);

const PricingSection = () => {
    const [plan, setPlan] = useState('pro');
    const [users, setUsers] = useState(5);
    const [cost, setCost] = useState(0);

    const plans = {
        basic: { name: 'Basic', adminFee: 49, userFee: 20, maxUsers: 4 },
        pro: { name: 'Pro', adminFee: 179, userFee: 25, maxUsers: 20 },
        elite: { name: 'Elite', adminFee: 399, userFee: 25, maxUsers: 50 },
    };

    useEffect(() => {
        const selectedPlan = plans[plan];
        const totalCost = selectedPlan.adminFee + (users > 1 ? (users - 1) * selectedPlan.userFee : 0);
        setCost(totalCost);
    }, [plan, users]);

    const handlePlanChange = (planKey: string) => {
        setPlan(planKey);
        const selectedPlan = plans[planKey];
        if (users > selectedPlan.maxUsers) {
            setUsers(selectedPlan.maxUsers);
        }
    };
    
    const { openSignIn } = useClerk();

    return (
        <Section id="pricing">
            <SectionTitle subtitle="Choose the plan that's right for your business.">Simple, Transparent Pricing</SectionTitle>
            <div className="grid lg:grid-cols-3 gap-8 items-stretch">
                {Object.entries(plans).map(([key, p]) => (
                     <div key={key} className={`bg-gray-800 rounded-2xl p-8 flex flex-col border-2 transition-all duration-300 ${plan === key ? 'border-primary shadow-neon-primary' : 'border-gray-700'}`}>
                        <h3 className="text-2xl font-bold text-white uppercase">{p.name}</h3>
                        <p className="text-secondary mt-1">{key === 'pro' ? 'Most Popular' : key === 'basic' ? 'For Starters' : 'For Power Users'}</p>
                        <div className="my-6">
                            <span className="text-5xl font-extrabold text-white">${p.adminFee}</span>
                            <span className="text-secondary">/mo for admin</span>
                        </div>
                        <p className="text-primary font-semibold">+ ${p.userFee} /mo per additional user</p>
                        <ul className="space-y-3 text-gray-300 mt-6 mb-8 flex-grow">
                            <li className="flex items-center"><CheckCircleIcon className="w-5 h-5 text-primary mr-2" /> All core features</li>
                            <li className="flex items-center"><CheckCircleIcon className="w-5 h-5 text-primary mr-2" /> CRM and Job Management</li>
                             <li className="flex items-center"><CheckCircleIcon className="w-5 h-5 text-primary mr-2" /> Up to {p.maxUsers} total users</li>
                        </ul>
                         <button onClick={() => openSignIn()} className={`w-full py-3 rounded-lg font-semibold transition-colors duration-300 ${plan === key ? 'bg-primary text-white' : 'bg-gray-700 text-gray-200 hover:bg-primary hover:text-white'}`}>
                           Choose {p.name}
                        </button>
                    </div>
                ))}
            </div>
            
            {/* Interactive Calculator */}
            <div className="mt-16 bg-gray-800 rounded-2xl p-8 max-w-4xl mx-auto">
                 <h3 className="text-2xl font-bold text-white text-center mb-6">Estimate Your Monthly Cost</h3>
                 <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="font-semibold text-white">Select Your Plan:</label>
                        </div>
                        <div className="flex space-x-2 p-1 bg-gray-700 rounded-lg">
                            {Object.entries(plans).map(([key, p]) => (
                                <button key={key} onClick={() => handlePlanChange(key)} className={`w-full py-2 rounded-md font-semibold text-sm transition-colors ${plan === key ? 'bg-primary text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                                    {p.name}
                                </button>
                            ))}
                        </div>
                        <div className="mt-6">
                            <div className="flex justify-between mb-2">
                                <label className="font-semibold text-white">Number of Users:</label>
                                <span className="font-bold text-primary text-lg">{users}</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max={plans[plan].maxUsers}
                                value={users}
                                onChange={(e) => setUsers(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb"
                            />
                        </div>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-6 text-center">
                        <p className="text-secondary">ESTIMATED MONTHLY COST</p>
                        <p className="text-5xl font-extrabold text-primary my-2">${cost.toFixed(2)}</p>
                        <p className="text-gray-400 text-sm">Includes 1 admin + {users > 1 ? users - 1 : 0} additional users.</p>
                    </div>
                 </div>
            </div>
        </Section>
    );
};

const TestimonialsSection = () => {
    const testimonials = [
        { name: 'Marcus L.', company: 'Prestige Auto Spa', text: 'Detailing Pro has revolutionized how we manage our jobs. The AI scheduling assistant alone saves us hours every week. It\'s a complete game-changer.' },
        { name: 'Sarah T.', company: 'Gleam Team Mobile', text: 'The customer portal is fantastic. Clients can approve estimates and pay online, which has cut down our admin time by at least 50%. I can\'t imagine running my business without it.' },
        { name: 'Carlos R.', company: 'Driven Details', text: 'As a solo operator, this app is my entire back office. Inventory, invoicing, CRM... it does it all. The visual quoting feature is just incredible and wows my customers every time.' },
    ];
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex(prevIndex => (prevIndex + 1) % testimonials.length);
        }, 5000); // Change testimonial every 5 seconds
        return () => clearInterval(interval);
    }, [testimonials.length]);

    return (
        <Section id="testimonials" className="bg-gray-800">
            <SectionTitle subtitle="See what our customers are saying.">Trusted by Detailers Everywhere</SectionTitle>
            <div className="relative max-w-3xl mx-auto h-48">
                {testimonials.map((t, index) => (
                    <div key={index} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="text-center">
                            <p className="text-xl italic text-gray-200">"{t.text}"</p>
                            <p className="font-bold text-primary mt-4">{t.name}</p>
                            <p className="text-secondary text-sm">{t.company}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Section>
    );
};


const FAQItem = ({ q, a }: { q: string; a: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-700">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center py-5 text-left">
                <span className="font-semibold text-white">{q}</span>
                <ChevronDownIcon className={`w-5 h-5 text-secondary transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
                <p className="pb-5 text-secondary">{a}</p>
            </div>
        </div>
    );
};


const FAQSection = () => (
    <Section id="faq">
        <SectionTitle subtitle="Have questions? We've got answers.">Frequently Asked Questions</SectionTitle>
        <div className="max-w-3xl mx-auto">
            <FAQItem q="Can I use this on my phone or tablet?" a="Absolutely! Detailing Pro is designed to be fully responsive, providing a seamless experience whether you're in the office on a desktop or in the field with a mobile device." />
            <FAQItem q="Is my data secure?" a="Yes. We take security seriously. All user authentication is handled by Clerk, a leading identity platform, and all payment processing is managed by Stripe. Your business data is encrypted and secure." />
            <FAQItem q="Can I change my plan later?" a="Of course. You can upgrade or downgrade your plan at any time from the settings page to fit the needs of your growing business." />
             <FAQItem q="Is there a contract or can I cancel anytime?" a="There are no long-term contracts. Detailing Pro is a month-to-month service, and you can cancel your subscription at any time without penalty." />
        </div>
    </Section>
);

const Footer = () => (
    <footer className="bg-gray-800 border-t border-gray-700">
        <div className="container mx-auto px-4 py-8 text-center text-secondary">
            <p>&copy; {new Date().getFullYear()} Detailing Pro. All Rights Reserved.</p>
        </div>
    </footer>
);

// --- Main Landing Page Component ---

const LandingPage = () => {
    return (
        <div className="bg-gray-900">
            <Header />
            <main>
                <HeroSection />
                <FeaturesSection />
                <PricingSection />
                <TestimonialsSection />
                <FAQSection />
            </main>
            <Footer />
            <style>{`
                /* Custom styles for the range slider thumb to match the primary color */
                .range-thumb::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    background: #00AE98; /* primary color */
                    cursor: pointer;
                    border-radius: 50%;
                    border: 2px solid #1E1E1E;
                }

                .range-thumb::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    background: #00AE98; /* primary color */
                    cursor: pointer;
                    border-radius: 50%;
                     border: 2px solid #1E1E1E;
                }
            `}</style>
        </div>
    );
};

export default LandingPage;