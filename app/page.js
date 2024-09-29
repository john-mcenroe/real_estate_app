'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Next.js routing
import Script from 'next/script'; // Next.js Script component
import { FaChevronDown } from 'react-icons/fa'; // ChevronDown icon from Font Awesome

// Header Component
const Header = () => {
  return (
    <header className="bg-white shadow-sm">
      <nav className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="text-lg font-bold text-blue-700">PriceMyPlace.ie</div>
          <div className="hidden md:flex space-x-4">
            <a href="#" className="text-gray-600 hover:text-blue-700">Home</a>
            <a href="#" className="text-gray-600 hover:text-blue-700">About</a>
          </div>
        </div>
      </nav>
    </header>
  );
};

// PropertyValuationHero Component with Google Places Autocomplete
const PropertyValuationHero = () => {
  const [address, setAddress] = useState('');
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);
  const router = useRouter();

  // Geocode the selected address to validate its location (Optional - Server-Side Validation)
  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.results.length === 0) {
        return null;
      }

      // Check if the result is from Ireland (IE)
      const countryComponent = data.results[0].address_components.find((component) =>
        component.types.includes('country')
      );

      if (countryComponent && countryComponent.short_name === 'IE') {
        return data.results[0];
      } else {
        return null; // Address is not in Ireland
      }
    } catch (error) {
      console.error('Error fetching geolocation data:', error.message);
      return null;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (address.trim() === '') {
      alert('Please enter an Irish address.');
      return;
    }

    const geocodedResult = await geocodeAddress(address); // Optional server-side validation

    if (!geocodedResult) {
      alert('Please select a valid address in Ireland.');
      return;
    }

    // Proceed if valid
    const params = new URLSearchParams({
      lat: geocodedResult.geometry.location.lat,
      lng: geocodedResult.geometry.location.lng,
      address: geocodedResult.formatted_address,
    });

    router.push(`/result?${params.toString()}`);
  };

  // Initialize Autocomplete after Google Maps script loads
  const handleScriptLoad = () => {
    if (window.google) {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'], // Restrict to addresses
        componentRestrictions: { country: 'ie' }, // Restrict results to Ireland
        fields: ['address_components', 'formatted_address', 'geometry'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place.geometry) {
          alert('No details available for input: "' + place.name + '"');
          return;
        }

        // Validate that the place is in Ireland
        const countryComponent = place.address_components.find((component) =>
          component.types.includes('country')
        );

        if (countryComponent && countryComponent.short_name !== 'IE') {
          alert('Please select an address in Ireland.');
          setAddress('');
          return;
        }

        setAddress(place.formatted_address);
      });

      autocompleteRef.current = autocomplete;
    }
  };

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&region=IE`}
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />

      <div
        className="relative bg-cover bg-center text-gray-800 py-24"
        style={{
          backgroundImage: "url('/pexels-photo-dublin.jpeg')",
        }}
      >
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-3xl font-bold mb-2 text-white">How Much Is My Home Worth?</h1>
          <p className="text-md mb-6 text-gray-200">Enter your address to get an instant estimate.</p>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col items-center sm:flex-row sm:justify-center sm:space-x-4 space-y-4 sm:space-y-0 max-w-2xl mx-auto w-full"
          >
            <div className="w-full sm:w-3/4 lg:w-2/3">
              <input
                id="address"
                type="text"
                placeholder="Enter your address"
                className="w-full px-4 py-3 rounded-lg focus:outline-none text-gray-900 shadow-md"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                ref={inputRef}
                aria-label="Property Address"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition duration-300 shadow-md"
            >
              Get Valuation
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

// FAQ Component (fixed with FaChevronDown import)
const FAQ = () => {
  const faqs = [
    {
      question: "How accurate is the property valuation?",
      answer: "Our AI tool uses market data to give a precise estimate. For official advice, consult an agent."
    },
    {
      question: "Is my personal information secure?",
      answer: "Your privacy is our priority, and your data is never shared without consent."
    },
    {
      question: "How quickly can I get my valuation?",
      answer: "Instantly! Get an estimate in seconds after entering your address."
    },
    {
      question: "Can I use this tool to buy a home?",
      answer: "Yes! The tool helps buyers understand the market better."
    },
    {
      question: "Do I need to register?",
      answer: "No registration needed. However, signing up lets you save your estimates."
    },
    {
      question: "Why specialize in the Irish market?",
      answer: "We leverage data specifically from the Irish property market, ensuring that all estimates are based on the most relevant local trends, regulations, and sales data. This makes our valuations more accurate for Irish homeowners compared to global tools."
    },
  ];

  const [expandedIndices, setExpandedIndices] = useState([]);

  const toggleFAQ = (index) => {
    setExpandedIndices((prev) =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="py-6 bg-white">
      <div className="container mx-auto px-4 max-w-xl">
        <h2 className="text-xl font-bold text-center mb-4">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-200 pb-2">
              <button
                onClick={() => toggleFAQ(index)}
                className="flex justify-between items-center w-full text-left focus:outline-none"
                aria-expanded={expandedIndices.includes(index)}
                aria-controls={`faq-${index}`}
              >
                <span className="text-sm font-semibold text-gray-800">{faq.question}</span>
                <FaChevronDown
                  className={`text-blue-600 transition-transform duration-300 ${expandedIndices.includes(index) ? 'transform rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {expandedIndices.includes(index) && (
                <p id={`faq-${index}`} className="mt-1 text-gray-600 text-xs">{faq.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Footer Component with Smaller and Responsive Font
const Footer = () => {
  return (
    <footer className="bg-gray-100 text-gray-600 py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <h3 className="text-sm md:text-md font-semibold mb-2">PriceMyPlace.ie</h3>
            <p className="text-xs md:text-sm">AI-powered home valuations.</p>
          </div>
          <div>
            <h4 className="text-sm md:text-md font-semibold mb-2">Quick Links</h4>
            <ul>
              <li><a href="#" className="text-xs md:text-sm hover:text-blue-600">Home</a></li>
              <li><a href="#" className="text-xs md:text-sm hover:text-blue-600">About Us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm md:text-md font-semibold mb-2">Legal</h4>
            <ul>
              <li><a href="#" className="text-xs md:text-sm hover:text-blue-600">Privacy Policy</a></li>
              <li><a href="#" className="text-xs md:text-sm hover:text-blue-600">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm md:text-md font-semibold mb-2">Follow Us</h4>
            <ul>
              <li><a href="#" className="text-xs md:text-sm hover:text-blue-600">Facebook</a></li>
              <li><a href="#" className="text-xs md:text-sm hover:text-blue-600">LinkedIn</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-6 text-center text-xs md:text-sm">
          <p>&copy; 2024 PriceMyPlace.ie. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// Main App Component
export default function RealEstateApp() {
  return (
    <div className="bg-white min-h-screen">
      <Header />
      <main>
        <PropertyValuationHero />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
