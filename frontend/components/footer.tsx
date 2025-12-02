"use client";

import { Button } from "@/components/ui/button";
import { Linkedin, Github, Youtube, Twitter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full bg-gradient-to-b from-gray-900 to-black border-t border-gray-800 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute right-0 top-0 w-1/3 h-full opacity-10">
        <div className="absolute inset-0 bg-gradient-to-l from-blue-500/20 to-transparent" />
        <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
          <path
            d="M0 200 L100 150 L200 180 L300 120 L400 160"
            stroke="currentColor"
            strokeWidth="2"
            className="text-blue-400"
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8">
          {/* Left Section - Company Branding and Social Media */}
          <div className="md:col-span-3">
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/logo.png"
                alt="Logo"
                width={150}
                height={40}
                className=" w-auto object-contain cursor-pointer"
                priority
              />
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border-2 border-white/30 bg-gray-800/50 flex items-center justify-center hover:bg-gray-700 transition-colors"
              >
                <Linkedin className="h-5 w-5 text-white" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border-2 border-white/30 bg-gray-800/50 flex items-center justify-center hover:bg-gray-700 transition-colors"
              >
                <Github className="h-5 w-5 text-white" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border-2 border-white/30 bg-gray-800/50 flex items-center justify-center hover:bg-gray-700 transition-colors"
              >
                <Youtube className="h-5 w-5 text-white" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border-2 border-white/30 bg-gray-800/50 flex items-center justify-center hover:bg-gray-700 transition-colors"
              >
                <Twitter className="h-5 w-5 text-white" />
              </a>
            </div>
          </div>

          {/* Middle Section - Navigation Links */}
          <div className="md:col-span-6 grid grid-cols-3 gap-8">
            <div>
              <h3 className="text-white font-bold mb-4">Pages</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Solutions</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Debugging Agent
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Testing Agent
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    LLD Agent
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Q&A Agent
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Community
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Open-Source
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Section - Discord Community CTA */}
          <div className="md:col-span-3">
            <div className="bg-blue-600 rounded-lg p-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <h3 className="text-white font-bold text-lg mb-2">
                  Join our discord community
                </h3>
                <p className="text-white/90 text-sm mb-4">
                  Get support, share and connect with AI developers.
                </p>
                <Button
                  className="w-full bg-white text-gray-900 hover:bg-gray-100 border border-gray-300"
                  size="lg"
                >
                  Join our community
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Copyright and Legal */}
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">© Momenta Softwares Inc</p>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Terms of services
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
