/**
 * 100 synthetic demo accounts. Run from backend:
 *   node scripts/seed-demo-users.mjs          # validate only; no DB access
 *   node scripts/seed-demo-users.mjs --apply  # insert missing accounts
 * Emails: firstName@example.com. Passwords: FirstName@123.
 * Demo credentials are predictable: use for test/demo accounts only.
 * Avatars: DiceBear avataaars (https://www.dicebear.com/styles/avataaars/).
 * Never imports app.js or starts notification workers.
 */
import "dotenv/config";
import mongoose from "mongoose";
import assert from "node:assert/strict";
import User from "../src/models/user.js";
import { validateProfileData } from "../src/utils/validateProfileData.js";
import { sanitizeUserData } from "../src/utils/validation.js";
import { SIGNUP_FIELDS } from "../constants.js";

const users = [
  {
    "firstName": "Rahul",
    "lastName": "Jain",
    "email": "rahul@example.com",
    "password": "Rahul@123",
    "age": 22,
    "gender": "Male",
    "location": "Bengaluru",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-1",
    "bio": "Demo profile for testing. Frontend developer based in Bengaluru, interested in accessible interfaces and fast web experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "TypeScript",
      "CSS",
      "Next.js"
    ],
    "interests": [
      "Open source",
      "Hiking",
      "Travel"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Aarav",
    "lastName": "Sharma",
    "email": "aarav@example.com",
    "password": "Aarav@123",
    "age": 23,
    "gender": "Male",
    "location": "Mumbai",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-2",
    "bio": "Demo profile for testing. Backend developer based in Mumbai, interested in reliable APIs and well-designed data models. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Node.js",
      "Express",
      "MongoDB",
      "PostgreSQL"
    ],
    "interests": [
      "Photography",
      "Chess",
      "Cooking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Vivaan",
    "lastName": "Verma",
    "email": "vivaan@example.com",
    "password": "Vivaan@123",
    "age": 24,
    "gender": "Male",
    "location": "Delhi",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-3",
    "bio": "Demo profile for testing. Full-stack developer based in Delhi, interested in useful products from interface to database. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "Node.js",
      "TypeScript",
      "PostgreSQL"
    ],
    "interests": [
      "Reading",
      "Music",
      "Gaming"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Aditya",
    "lastName": "Gupta",
    "email": "aditya@example.com",
    "password": "Aditya@123",
    "age": 25,
    "gender": "Male",
    "location": "Hyderabad",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-4",
    "bio": "Demo profile for testing. AI engineer based in Hyderabad, interested in practical AI tools and thoughtful experiments. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "PyTorch",
      "FastAPI",
      "SQL"
    ],
    "interests": [
      "Hiking",
      "Travel",
      "Cycling"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Arjun",
    "lastName": "Mehta",
    "email": "arjun@example.com",
    "password": "Arjun@123",
    "age": 26,
    "gender": "Male",
    "location": "Pune",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-5",
    "bio": "Demo profile for testing. Mobile developer based in Pune, interested in smooth mobile experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React Native",
      "Expo",
      "TypeScript",
      "Firebase"
    ],
    "interests": [
      "Chess",
      "Cooking",
      "Open source"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Saiyan",
    "lastName": "Kapoor",
    "email": "saiyan@example.com",
    "password": "Saiyan@123",
    "age": 27,
    "gender": "Male",
    "location": "Chennai",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-6",
    "bio": "Demo profile for testing. Cloud engineer based in Chennai, interested in repeatable deployments and reliable infrastructure. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "AWS",
      "Docker",
      "Linux",
      "Terraform"
    ],
    "interests": [
      "Music",
      "Gaming",
      "Photography"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Reyansh",
    "lastName": "Malhotra",
    "email": "reyansh@example.com",
    "password": "Reyansh@123",
    "age": 28,
    "gender": "Male",
    "location": "Kolkata",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-7",
    "bio": "Demo profile for testing. Data engineer based in Kolkata, interested in clean datasets and dependable data pipelines. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "SQL",
      "Spark",
      "Airflow"
    ],
    "interests": [
      "Travel",
      "Cycling",
      "Reading"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Ayaan",
    "lastName": "Agarwal",
    "email": "ayaan@example.com",
    "password": "Ayaan@123",
    "age": 29,
    "gender": "Male",
    "location": "Ahmedabad",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-8",
    "bio": "Demo profile for testing. UI engineer based in Ahmedabad, interested in design systems and inclusive interactions. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "JavaScript",
      "CSS",
      "Figma",
      "React"
    ],
    "interests": [
      "Cooking",
      "Open source",
      "Hiking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Krish",
    "lastName": "Saxena",
    "email": "krish@example.com",
    "password": "Krish@123",
    "age": 30,
    "gender": "Male",
    "location": "Jaipur",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-9",
    "bio": "Demo profile for testing. Platform developer based in Jaipur, interested in developer tooling and service observability. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Go",
      "Docker",
      "PostgreSQL",
      "Linux"
    ],
    "interests": [
      "Gaming",
      "Photography",
      "Chess"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Ishaan",
    "lastName": "Mishra",
    "email": "ishaan@example.com",
    "password": "Ishaan@123",
    "age": 31,
    "gender": "Male",
    "location": "Lucknow",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-10",
    "bio": "Demo profile for testing. Quality engineer based in Lucknow, interested in clear test strategies and robust releases. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Playwright",
      "Cypress",
      "JavaScript",
      "SQL"
    ],
    "interests": [
      "Cycling",
      "Reading",
      "Music"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Shaurya",
    "lastName": "Iyer",
    "email": "shaurya@example.com",
    "password": "Shaurya@123",
    "age": 32,
    "gender": "Male",
    "location": "Gorakhpur",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-11",
    "bio": "Demo profile for testing. Frontend developer based in Gorakhpur, interested in accessible interfaces and fast web experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "TypeScript",
      "CSS",
      "Next.js"
    ],
    "interests": [
      "Open source",
      "Hiking",
      "Travel"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Atharv",
    "lastName": "Nair",
    "email": "atharv@example.com",
    "password": "Atharv@123",
    "age": 33,
    "gender": "Male",
    "location": "Noida",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-12",
    "bio": "Demo profile for testing. Backend developer based in Noida, interested in reliable APIs and well-designed data models. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Node.js",
      "Express",
      "MongoDB",
      "PostgreSQL"
    ],
    "interests": [
      "Photography",
      "Chess",
      "Cooking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Advait",
    "lastName": "Menon",
    "email": "advait@example.com",
    "password": "Advait@123",
    "age": 34,
    "gender": "Male",
    "location": "Indore",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-13",
    "bio": "Demo profile for testing. Full-stack developer based in Indore, interested in useful products from interface to database. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "Node.js",
      "TypeScript",
      "PostgreSQL"
    ],
    "interests": [
      "Reading",
      "Music",
      "Gaming"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Dhruv",
    "lastName": "Rao",
    "email": "dhruv@example.com",
    "password": "Dhruv@123",
    "age": 35,
    "gender": "Male",
    "location": "Kochi",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-14",
    "bio": "Demo profile for testing. AI engineer based in Kochi, interested in practical AI tools and thoughtful experiments. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "PyTorch",
      "FastAPI",
      "SQL"
    ],
    "interests": [
      "Hiking",
      "Travel",
      "Cycling"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Kabir",
    "lastName": "Reddy",
    "email": "kabir@example.com",
    "password": "Kabir@123",
    "age": 36,
    "gender": "Male",
    "location": "Chandigarh",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-15",
    "bio": "Demo profile for testing. Mobile developer based in Chandigarh, interested in smooth mobile experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React Native",
      "Expo",
      "TypeScript",
      "Firebase"
    ],
    "interests": [
      "Chess",
      "Cooking",
      "Open source"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Rohan",
    "lastName": "Desai",
    "email": "rohan@example.com",
    "password": "Rohan@123",
    "age": 37,
    "gender": "Male",
    "location": "Bengaluru",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-16",
    "bio": "Demo profile for testing. Cloud engineer based in Bengaluru, interested in repeatable deployments and reliable infrastructure. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "AWS",
      "Docker",
      "Linux",
      "Terraform"
    ],
    "interests": [
      "Music",
      "Gaming",
      "Photography"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Karan",
    "lastName": "Shah",
    "email": "karan@example.com",
    "password": "Karan@123",
    "age": 38,
    "gender": "Male",
    "location": "Mumbai",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-17",
    "bio": "Demo profile for testing. Data engineer based in Mumbai, interested in clean datasets and dependable data pipelines. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "SQL",
      "Spark",
      "Airflow"
    ],
    "interests": [
      "Travel",
      "Cycling",
      "Reading"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Nikhil",
    "lastName": "Joshi",
    "email": "nikhil@example.com",
    "password": "Nikhil@123",
    "age": 39,
    "gender": "Male",
    "location": "Delhi",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-18",
    "bio": "Demo profile for testing. UI engineer based in Delhi, interested in design systems and inclusive interactions. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "JavaScript",
      "CSS",
      "Figma",
      "React"
    ],
    "interests": [
      "Cooking",
      "Open source",
      "Hiking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Varun",
    "lastName": "Kulkarni",
    "email": "varun@example.com",
    "password": "Varun@123",
    "age": 40,
    "gender": "Male",
    "location": "Hyderabad",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-19",
    "bio": "Demo profile for testing. Platform developer based in Hyderabad, interested in developer tooling and service observability. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Go",
      "Docker",
      "PostgreSQL",
      "Linux"
    ],
    "interests": [
      "Gaming",
      "Photography",
      "Chess"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Akash",
    "lastName": "Patil",
    "email": "akash@example.com",
    "password": "Akash@123",
    "age": 22,
    "gender": "Male",
    "location": "Pune",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-20",
    "bio": "Demo profile for testing. Quality engineer based in Pune, interested in clear test strategies and robust releases. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Playwright",
      "Cypress",
      "JavaScript",
      "SQL"
    ],
    "interests": [
      "Cycling",
      "Reading",
      "Music"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Aman",
    "lastName": "Jain",
    "email": "aman@example.com",
    "password": "Aman@123",
    "age": 23,
    "gender": "Male",
    "location": "Chennai",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-21",
    "bio": "Demo profile for testing. Frontend developer based in Chennai, interested in accessible interfaces and fast web experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "TypeScript",
      "CSS",
      "Next.js"
    ],
    "interests": [
      "Open source",
      "Hiking",
      "Travel"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Ankit",
    "lastName": "Sharma",
    "email": "ankit@example.com",
    "password": "Ankit@123",
    "age": 24,
    "gender": "Male",
    "location": "Kolkata",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-22",
    "bio": "Demo profile for testing. Backend developer based in Kolkata, interested in reliable APIs and well-designed data models. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Node.js",
      "Express",
      "MongoDB",
      "PostgreSQL"
    ],
    "interests": [
      "Photography",
      "Chess",
      "Cooking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Saurabh",
    "lastName": "Verma",
    "email": "saurabh@example.com",
    "password": "Saurabh@123",
    "age": 25,
    "gender": "Male",
    "location": "Ahmedabad",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-23",
    "bio": "Demo profile for testing. Full-stack developer based in Ahmedabad, interested in useful products from interface to database. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "Node.js",
      "TypeScript",
      "PostgreSQL"
    ],
    "interests": [
      "Reading",
      "Music",
      "Gaming"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Rohit",
    "lastName": "Gupta",
    "email": "rohit@example.com",
    "password": "Rohit@123",
    "age": 26,
    "gender": "Male",
    "location": "Jaipur",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-24",
    "bio": "Demo profile for testing. AI engineer based in Jaipur, interested in practical AI tools and thoughtful experiments. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "PyTorch",
      "FastAPI",
      "SQL"
    ],
    "interests": [
      "Hiking",
      "Travel",
      "Cycling"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Mohit",
    "lastName": "Mehta",
    "email": "mohit@example.com",
    "password": "Mohit@123",
    "age": 27,
    "gender": "Male",
    "location": "Lucknow",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-25",
    "bio": "Demo profile for testing. Mobile developer based in Lucknow, interested in smooth mobile experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React Native",
      "Expo",
      "TypeScript",
      "Firebase"
    ],
    "interests": [
      "Chess",
      "Cooking",
      "Open source"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Gaurav",
    "lastName": "Kapoor",
    "email": "gaurav@example.com",
    "password": "Gaurav@123",
    "age": 28,
    "gender": "Male",
    "location": "Gorakhpur",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-26",
    "bio": "Demo profile for testing. Cloud engineer based in Gorakhpur, interested in repeatable deployments and reliable infrastructure. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "AWS",
      "Docker",
      "Linux",
      "Terraform"
    ],
    "interests": [
      "Music",
      "Gaming",
      "Photography"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Pranav",
    "lastName": "Malhotra",
    "email": "pranav@example.com",
    "password": "Pranav@123",
    "age": 29,
    "gender": "Male",
    "location": "Noida",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-27",
    "bio": "Demo profile for testing. Data engineer based in Noida, interested in clean datasets and dependable data pipelines. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "SQL",
      "Spark",
      "Airflow"
    ],
    "interests": [
      "Travel",
      "Cycling",
      "Reading"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Siddharth",
    "lastName": "Agarwal",
    "email": "siddharth@example.com",
    "password": "Siddharth@123",
    "age": 30,
    "gender": "Male",
    "location": "Indore",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-28",
    "bio": "Demo profile for testing. UI engineer based in Indore, interested in design systems and inclusive interactions. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "JavaScript",
      "CSS",
      "Figma",
      "React"
    ],
    "interests": [
      "Cooking",
      "Open source",
      "Hiking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Harsh",
    "lastName": "Saxena",
    "email": "harsh@example.com",
    "password": "Harsh@123",
    "age": 31,
    "gender": "Male",
    "location": "Kochi",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-29",
    "bio": "Demo profile for testing. Platform developer based in Kochi, interested in developer tooling and service observability. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Go",
      "Docker",
      "PostgreSQL",
      "Linux"
    ],
    "interests": [
      "Gaming",
      "Photography",
      "Chess"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Yash",
    "lastName": "Mishra",
    "email": "yash@example.com",
    "password": "Yash@123",
    "age": 32,
    "gender": "Male",
    "location": "Chandigarh",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-30",
    "bio": "Demo profile for testing. Quality engineer based in Chandigarh, interested in clear test strategies and robust releases. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Playwright",
      "Cypress",
      "JavaScript",
      "SQL"
    ],
    "interests": [
      "Cycling",
      "Reading",
      "Music"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Manish",
    "lastName": "Iyer",
    "email": "manish@example.com",
    "password": "Manish@123",
    "age": 33,
    "gender": "Male",
    "location": "Bengaluru",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-31",
    "bio": "Demo profile for testing. Frontend developer based in Bengaluru, interested in accessible interfaces and fast web experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "TypeScript",
      "CSS",
      "Next.js"
    ],
    "interests": [
      "Open source",
      "Hiking",
      "Travel"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Deepak",
    "lastName": "Nair",
    "email": "deepak@example.com",
    "password": "Deepak@123",
    "age": 34,
    "gender": "Male",
    "location": "Mumbai",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-32",
    "bio": "Demo profile for testing. Backend developer based in Mumbai, interested in reliable APIs and well-designed data models. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Node.js",
      "Express",
      "MongoDB",
      "PostgreSQL"
    ],
    "interests": [
      "Photography",
      "Chess",
      "Cooking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Abhishek",
    "lastName": "Menon",
    "email": "abhishek@example.com",
    "password": "Abhishek@123",
    "age": 35,
    "gender": "Male",
    "location": "Delhi",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-33",
    "bio": "Demo profile for testing. Full-stack developer based in Delhi, interested in useful products from interface to database. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "Node.js",
      "TypeScript",
      "PostgreSQL"
    ],
    "interests": [
      "Reading",
      "Music",
      "Gaming"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Ashish",
    "lastName": "Rao",
    "email": "ashish@example.com",
    "password": "Ashish@123",
    "age": 36,
    "gender": "Male",
    "location": "Hyderabad",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-34",
    "bio": "Demo profile for testing. AI engineer based in Hyderabad, interested in practical AI tools and thoughtful experiments. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "PyTorch",
      "FastAPI",
      "SQL"
    ],
    "interests": [
      "Hiking",
      "Travel",
      "Cycling"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Anurag",
    "lastName": "Reddy",
    "email": "anurag@example.com",
    "password": "Anurag@123",
    "age": 37,
    "gender": "Male",
    "location": "Pune",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-35",
    "bio": "Demo profile for testing. Mobile developer based in Pune, interested in smooth mobile experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React Native",
      "Expo",
      "TypeScript",
      "Firebase"
    ],
    "interests": [
      "Chess",
      "Cooking",
      "Open source"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Sushant",
    "lastName": "Desai",
    "email": "sushant@example.com",
    "password": "Sushant@123",
    "age": 38,
    "gender": "Male",
    "location": "Chennai",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-36",
    "bio": "Demo profile for testing. Cloud engineer based in Chennai, interested in repeatable deployments and reliable infrastructure. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "AWS",
      "Docker",
      "Linux",
      "Terraform"
    ],
    "interests": [
      "Music",
      "Gaming",
      "Photography"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Vivek",
    "lastName": "Shah",
    "email": "vivek@example.com",
    "password": "Vivek@123",
    "age": 39,
    "gender": "Male",
    "location": "Kolkata",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-37",
    "bio": "Demo profile for testing. Data engineer based in Kolkata, interested in clean datasets and dependable data pipelines. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "SQL",
      "Spark",
      "Airflow"
    ],
    "interests": [
      "Travel",
      "Cycling",
      "Reading"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Vinay",
    "lastName": "Joshi",
    "email": "vinay@example.com",
    "password": "Vinay@123",
    "age": 40,
    "gender": "Male",
    "location": "Ahmedabad",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-38",
    "bio": "Demo profile for testing. UI engineer based in Ahmedabad, interested in design systems and inclusive interactions. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "JavaScript",
      "CSS",
      "Figma",
      "React"
    ],
    "interests": [
      "Cooking",
      "Open source",
      "Hiking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Sanjay",
    "lastName": "Kulkarni",
    "email": "sanjay@example.com",
    "password": "Sanjay@123",
    "age": 22,
    "gender": "Male",
    "location": "Jaipur",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-39",
    "bio": "Demo profile for testing. Platform developer based in Jaipur, interested in developer tooling and service observability. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Go",
      "Docker",
      "PostgreSQL",
      "Linux"
    ],
    "interests": [
      "Gaming",
      "Photography",
      "Chess"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Ajay",
    "lastName": "Patil",
    "email": "ajay@example.com",
    "password": "Ajay@123",
    "age": 23,
    "gender": "Male",
    "location": "Lucknow",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-40",
    "bio": "Demo profile for testing. Quality engineer based in Lucknow, interested in clear test strategies and robust releases. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Playwright",
      "Cypress",
      "JavaScript",
      "SQL"
    ],
    "interests": [
      "Cycling",
      "Reading",
      "Music"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Vijay",
    "lastName": "Jain",
    "email": "vijay@example.com",
    "password": "Vijay@123",
    "age": 24,
    "gender": "Male",
    "location": "Gorakhpur",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-41",
    "bio": "Demo profile for testing. Frontend developer based in Gorakhpur, interested in accessible interfaces and fast web experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "TypeScript",
      "CSS",
      "Next.js"
    ],
    "interests": [
      "Open source",
      "Hiking",
      "Travel"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Rajat",
    "lastName": "Sharma",
    "email": "rajat@example.com",
    "password": "Rajat@123",
    "age": 25,
    "gender": "Male",
    "location": "Noida",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-42",
    "bio": "Demo profile for testing. Backend developer based in Noida, interested in reliable APIs and well-designed data models. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Node.js",
      "Express",
      "MongoDB",
      "PostgreSQL"
    ],
    "interests": [
      "Photography",
      "Chess",
      "Cooking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Rishabh",
    "lastName": "Verma",
    "email": "rishabh@example.com",
    "password": "Rishabh@123",
    "age": 26,
    "gender": "Male",
    "location": "Indore",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-43",
    "bio": "Demo profile for testing. Full-stack developer based in Indore, interested in useful products from interface to database. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "Node.js",
      "TypeScript",
      "PostgreSQL"
    ],
    "interests": [
      "Reading",
      "Music",
      "Gaming"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Kartik",
    "lastName": "Gupta",
    "email": "kartik@example.com",
    "password": "Kartik@123",
    "age": 27,
    "gender": "Male",
    "location": "Kochi",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-44",
    "bio": "Demo profile for testing. AI engineer based in Kochi, interested in practical AI tools and thoughtful experiments. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "PyTorch",
      "FastAPI",
      "SQL"
    ],
    "interests": [
      "Hiking",
      "Travel",
      "Cycling"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Mayank",
    "lastName": "Mehta",
    "email": "mayank@example.com",
    "password": "Mayank@123",
    "age": 28,
    "gender": "Male",
    "location": "Chandigarh",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-45",
    "bio": "Demo profile for testing. Mobile developer based in Chandigarh, interested in smooth mobile experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React Native",
      "Expo",
      "TypeScript",
      "Firebase"
    ],
    "interests": [
      "Chess",
      "Cooking",
      "Open source"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Shreyas",
    "lastName": "Kapoor",
    "email": "shreyas@example.com",
    "password": "Shreyas@123",
    "age": 29,
    "gender": "Male",
    "location": "Bengaluru",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-46",
    "bio": "Demo profile for testing. Cloud engineer based in Bengaluru, interested in repeatable deployments and reliable infrastructure. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "AWS",
      "Docker",
      "Linux",
      "Terraform"
    ],
    "interests": [
      "Music",
      "Gaming",
      "Photography"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Tanmay",
    "lastName": "Malhotra",
    "email": "tanmay@example.com",
    "password": "Tanmay@123",
    "age": 30,
    "gender": "Male",
    "location": "Mumbai",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-47",
    "bio": "Demo profile for testing. Data engineer based in Mumbai, interested in clean datasets and dependable data pipelines. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "SQL",
      "Spark",
      "Airflow"
    ],
    "interests": [
      "Travel",
      "Cycling",
      "Reading"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Uday",
    "lastName": "Agarwal",
    "email": "uday@example.com",
    "password": "Uday@123",
    "age": 31,
    "gender": "Male",
    "location": "Delhi",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-48",
    "bio": "Demo profile for testing. UI engineer based in Delhi, interested in design systems and inclusive interactions. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "JavaScript",
      "CSS",
      "Figma",
      "React"
    ],
    "interests": [
      "Cooking",
      "Open source",
      "Hiking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Utkarsh",
    "lastName": "Saxena",
    "email": "utkarsh@example.com",
    "password": "Utkarsh@123",
    "age": 32,
    "gender": "Male",
    "location": "Hyderabad",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-49",
    "bio": "Demo profile for testing. Platform developer based in Hyderabad, interested in developer tooling and service observability. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Go",
      "Docker",
      "PostgreSQL",
      "Linux"
    ],
    "interests": [
      "Gaming",
      "Photography",
      "Chess"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Vedant",
    "lastName": "Mishra",
    "email": "vedant@example.com",
    "password": "Vedant@123",
    "age": 33,
    "gender": "Male",
    "location": "Pune",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-50",
    "bio": "Demo profile for testing. Quality engineer based in Pune, interested in clear test strategies and robust releases. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Playwright",
      "Cypress",
      "JavaScript",
      "SQL"
    ],
    "interests": [
      "Cycling",
      "Reading",
      "Music"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Priya",
    "lastName": "Iyer",
    "email": "priya@example.com",
    "password": "Priya@123",
    "age": 34,
    "gender": "Female",
    "location": "Chennai",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-51",
    "bio": "Demo profile for testing. Frontend developer based in Chennai, interested in accessible interfaces and fast web experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "TypeScript",
      "CSS",
      "Next.js"
    ],
    "interests": [
      "Open source",
      "Hiking",
      "Travel"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Aanya",
    "lastName": "Nair",
    "email": "aanya@example.com",
    "password": "Aanya@123",
    "age": 35,
    "gender": "Female",
    "location": "Kolkata",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-52",
    "bio": "Demo profile for testing. Backend developer based in Kolkata, interested in reliable APIs and well-designed data models. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Node.js",
      "Express",
      "MongoDB",
      "PostgreSQL"
    ],
    "interests": [
      "Photography",
      "Chess",
      "Cooking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Ananya",
    "lastName": "Menon",
    "email": "ananya@example.com",
    "password": "Ananya@123",
    "age": 36,
    "gender": "Female",
    "location": "Ahmedabad",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-53",
    "bio": "Demo profile for testing. Full-stack developer based in Ahmedabad, interested in useful products from interface to database. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "Node.js",
      "TypeScript",
      "PostgreSQL"
    ],
    "interests": [
      "Reading",
      "Music",
      "Gaming"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Diya",
    "lastName": "Rao",
    "email": "diya@example.com",
    "password": "Diya@123",
    "age": 37,
    "gender": "Female",
    "location": "Jaipur",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-54",
    "bio": "Demo profile for testing. AI engineer based in Jaipur, interested in practical AI tools and thoughtful experiments. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "PyTorch",
      "FastAPI",
      "SQL"
    ],
    "interests": [
      "Hiking",
      "Travel",
      "Cycling"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Ishita",
    "lastName": "Reddy",
    "email": "ishita@example.com",
    "password": "Ishita@123",
    "age": 38,
    "gender": "Female",
    "location": "Lucknow",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-55",
    "bio": "Demo profile for testing. Mobile developer based in Lucknow, interested in smooth mobile experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React Native",
      "Expo",
      "TypeScript",
      "Firebase"
    ],
    "interests": [
      "Chess",
      "Cooking",
      "Open source"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Kavya",
    "lastName": "Desai",
    "email": "kavya@example.com",
    "password": "Kavya@123",
    "age": 39,
    "gender": "Female",
    "location": "Gorakhpur",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-56",
    "bio": "Demo profile for testing. Cloud engineer based in Gorakhpur, interested in repeatable deployments and reliable infrastructure. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "AWS",
      "Docker",
      "Linux",
      "Terraform"
    ],
    "interests": [
      "Music",
      "Gaming",
      "Photography"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Meera",
    "lastName": "Shah",
    "email": "meera@example.com",
    "password": "Meera@123",
    "age": 40,
    "gender": "Female",
    "location": "Noida",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-57",
    "bio": "Demo profile for testing. Data engineer based in Noida, interested in clean datasets and dependable data pipelines. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "SQL",
      "Spark",
      "Airflow"
    ],
    "interests": [
      "Travel",
      "Cycling",
      "Reading"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Nisha",
    "lastName": "Joshi",
    "email": "nisha@example.com",
    "password": "Nisha@123",
    "age": 22,
    "gender": "Female",
    "location": "Indore",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-58",
    "bio": "Demo profile for testing. UI engineer based in Indore, interested in design systems and inclusive interactions. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "JavaScript",
      "CSS",
      "Figma",
      "React"
    ],
    "interests": [
      "Cooking",
      "Open source",
      "Hiking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Pooja",
    "lastName": "Kulkarni",
    "email": "pooja@example.com",
    "password": "Pooja@123",
    "age": 23,
    "gender": "Female",
    "location": "Kochi",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-59",
    "bio": "Demo profile for testing. Platform developer based in Kochi, interested in developer tooling and service observability. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Go",
      "Docker",
      "PostgreSQL",
      "Linux"
    ],
    "interests": [
      "Gaming",
      "Photography",
      "Chess"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Riya",
    "lastName": "Patil",
    "email": "riya@example.com",
    "password": "Riya@123",
    "age": 24,
    "gender": "Female",
    "location": "Chandigarh",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-60",
    "bio": "Demo profile for testing. Quality engineer based in Chandigarh, interested in clear test strategies and robust releases. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Playwright",
      "Cypress",
      "JavaScript",
      "SQL"
    ],
    "interests": [
      "Cycling",
      "Reading",
      "Music"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Sneha",
    "lastName": "Jain",
    "email": "sneha@example.com",
    "password": "Sneha@123",
    "age": 25,
    "gender": "Female",
    "location": "Bengaluru",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-61",
    "bio": "Demo profile for testing. Frontend developer based in Bengaluru, interested in accessible interfaces and fast web experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "TypeScript",
      "CSS",
      "Next.js"
    ],
    "interests": [
      "Open source",
      "Hiking",
      "Travel"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Tanvi",
    "lastName": "Sharma",
    "email": "tanvi@example.com",
    "password": "Tanvi@123",
    "age": 26,
    "gender": "Female",
    "location": "Mumbai",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-62",
    "bio": "Demo profile for testing. Backend developer based in Mumbai, interested in reliable APIs and well-designed data models. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Node.js",
      "Express",
      "MongoDB",
      "PostgreSQL"
    ],
    "interests": [
      "Photography",
      "Chess",
      "Cooking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Aditi",
    "lastName": "Verma",
    "email": "aditi@example.com",
    "password": "Aditi@123",
    "age": 27,
    "gender": "Female",
    "location": "Delhi",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-63",
    "bio": "Demo profile for testing. Full-stack developer based in Delhi, interested in useful products from interface to database. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "Node.js",
      "TypeScript",
      "PostgreSQL"
    ],
    "interests": [
      "Reading",
      "Music",
      "Gaming"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Akshara",
    "lastName": "Gupta",
    "email": "akshara@example.com",
    "password": "Akshara@123",
    "age": 28,
    "gender": "Female",
    "location": "Hyderabad",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-64",
    "bio": "Demo profile for testing. AI engineer based in Hyderabad, interested in practical AI tools and thoughtful experiments. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "PyTorch",
      "FastAPI",
      "SQL"
    ],
    "interests": [
      "Hiking",
      "Travel",
      "Cycling"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Amrita",
    "lastName": "Mehta",
    "email": "amrita@example.com",
    "password": "Amrita@123",
    "age": 29,
    "gender": "Female",
    "location": "Pune",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-65",
    "bio": "Demo profile for testing. Mobile developer based in Pune, interested in smooth mobile experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React Native",
      "Expo",
      "TypeScript",
      "Firebase"
    ],
    "interests": [
      "Chess",
      "Cooking",
      "Open source"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Anika",
    "lastName": "Kapoor",
    "email": "anika@example.com",
    "password": "Anika@123",
    "age": 30,
    "gender": "Female",
    "location": "Chennai",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-66",
    "bio": "Demo profile for testing. Cloud engineer based in Chennai, interested in repeatable deployments and reliable infrastructure. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "AWS",
      "Docker",
      "Linux",
      "Terraform"
    ],
    "interests": [
      "Music",
      "Gaming",
      "Photography"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Anjali",
    "lastName": "Malhotra",
    "email": "anjali@example.com",
    "password": "Anjali@123",
    "age": 31,
    "gender": "Female",
    "location": "Kolkata",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-67",
    "bio": "Demo profile for testing. Data engineer based in Kolkata, interested in clean datasets and dependable data pipelines. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "SQL",
      "Spark",
      "Airflow"
    ],
    "interests": [
      "Travel",
      "Cycling",
      "Reading"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Ankita",
    "lastName": "Agarwal",
    "email": "ankita@example.com",
    "password": "Ankita@123",
    "age": 32,
    "gender": "Female",
    "location": "Ahmedabad",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-68",
    "bio": "Demo profile for testing. UI engineer based in Ahmedabad, interested in design systems and inclusive interactions. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "JavaScript",
      "CSS",
      "Figma",
      "React"
    ],
    "interests": [
      "Cooking",
      "Open source",
      "Hiking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Aparna",
    "lastName": "Saxena",
    "email": "aparna@example.com",
    "password": "Aparna@123",
    "age": 33,
    "gender": "Female",
    "location": "Jaipur",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-69",
    "bio": "Demo profile for testing. Platform developer based in Jaipur, interested in developer tooling and service observability. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Go",
      "Docker",
      "PostgreSQL",
      "Linux"
    ],
    "interests": [
      "Gaming",
      "Photography",
      "Chess"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Avani",
    "lastName": "Mishra",
    "email": "avani@example.com",
    "password": "Avani@123",
    "age": 34,
    "gender": "Female",
    "location": "Lucknow",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-70",
    "bio": "Demo profile for testing. Quality engineer based in Lucknow, interested in clear test strategies and robust releases. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Playwright",
      "Cypress",
      "JavaScript",
      "SQL"
    ],
    "interests": [
      "Cycling",
      "Reading",
      "Music"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Bhavya",
    "lastName": "Iyer",
    "email": "bhavya@example.com",
    "password": "Bhavya@123",
    "age": 35,
    "gender": "Female",
    "location": "Gorakhpur",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-71",
    "bio": "Demo profile for testing. Frontend developer based in Gorakhpur, interested in accessible interfaces and fast web experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "TypeScript",
      "CSS",
      "Next.js"
    ],
    "interests": [
      "Open source",
      "Hiking",
      "Travel"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Divya",
    "lastName": "Nair",
    "email": "divya@example.com",
    "password": "Divya@123",
    "age": 36,
    "gender": "Female",
    "location": "Noida",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-72",
    "bio": "Demo profile for testing. Backend developer based in Noida, interested in reliable APIs and well-designed data models. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Node.js",
      "Express",
      "MongoDB",
      "PostgreSQL"
    ],
    "interests": [
      "Photography",
      "Chess",
      "Cooking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Esha",
    "lastName": "Menon",
    "email": "esha@example.com",
    "password": "Esha@123",
    "age": 37,
    "gender": "Female",
    "location": "Indore",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-73",
    "bio": "Demo profile for testing. Full-stack developer based in Indore, interested in useful products from interface to database. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "Node.js",
      "TypeScript",
      "PostgreSQL"
    ],
    "interests": [
      "Reading",
      "Music",
      "Gaming"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Garima",
    "lastName": "Rao",
    "email": "garima@example.com",
    "password": "Garima@123",
    "age": 38,
    "gender": "Female",
    "location": "Kochi",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-74",
    "bio": "Demo profile for testing. AI engineer based in Kochi, interested in practical AI tools and thoughtful experiments. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "PyTorch",
      "FastAPI",
      "SQL"
    ],
    "interests": [
      "Hiking",
      "Travel",
      "Cycling"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Gauri",
    "lastName": "Reddy",
    "email": "gauri@example.com",
    "password": "Gauri@123",
    "age": 39,
    "gender": "Female",
    "location": "Chandigarh",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-75",
    "bio": "Demo profile for testing. Mobile developer based in Chandigarh, interested in smooth mobile experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React Native",
      "Expo",
      "TypeScript",
      "Firebase"
    ],
    "interests": [
      "Chess",
      "Cooking",
      "Open source"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Isha",
    "lastName": "Desai",
    "email": "isha@example.com",
    "password": "Isha@123",
    "age": 40,
    "gender": "Female",
    "location": "Bengaluru",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-76",
    "bio": "Demo profile for testing. Cloud engineer based in Bengaluru, interested in repeatable deployments and reliable infrastructure. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "AWS",
      "Docker",
      "Linux",
      "Terraform"
    ],
    "interests": [
      "Music",
      "Gaming",
      "Photography"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Jhanvi",
    "lastName": "Shah",
    "email": "jhanvi@example.com",
    "password": "Jhanvi@123",
    "age": 22,
    "gender": "Female",
    "location": "Mumbai",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-77",
    "bio": "Demo profile for testing. Data engineer based in Mumbai, interested in clean datasets and dependable data pipelines. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "SQL",
      "Spark",
      "Airflow"
    ],
    "interests": [
      "Travel",
      "Cycling",
      "Reading"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Juhi",
    "lastName": "Joshi",
    "email": "juhi@example.com",
    "password": "Juhi@123",
    "age": 23,
    "gender": "Female",
    "location": "Delhi",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-78",
    "bio": "Demo profile for testing. UI engineer based in Delhi, interested in design systems and inclusive interactions. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "JavaScript",
      "CSS",
      "Figma",
      "React"
    ],
    "interests": [
      "Cooking",
      "Open source",
      "Hiking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Kriti",
    "lastName": "Kulkarni",
    "email": "kriti@example.com",
    "password": "Kriti@123",
    "age": 24,
    "gender": "Female",
    "location": "Hyderabad",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-79",
    "bio": "Demo profile for testing. Platform developer based in Hyderabad, interested in developer tooling and service observability. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Go",
      "Docker",
      "PostgreSQL",
      "Linux"
    ],
    "interests": [
      "Gaming",
      "Photography",
      "Chess"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Lavanya",
    "lastName": "Patil",
    "email": "lavanya@example.com",
    "password": "Lavanya@123",
    "age": 25,
    "gender": "Female",
    "location": "Pune",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-80",
    "bio": "Demo profile for testing. Quality engineer based in Pune, interested in clear test strategies and robust releases. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Playwright",
      "Cypress",
      "JavaScript",
      "SQL"
    ],
    "interests": [
      "Cycling",
      "Reading",
      "Music"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Madhavi",
    "lastName": "Jain",
    "email": "madhavi@example.com",
    "password": "Madhavi@123",
    "age": 26,
    "gender": "Female",
    "location": "Chennai",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-81",
    "bio": "Demo profile for testing. Frontend developer based in Chennai, interested in accessible interfaces and fast web experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "TypeScript",
      "CSS",
      "Next.js"
    ],
    "interests": [
      "Open source",
      "Hiking",
      "Travel"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Mahima",
    "lastName": "Sharma",
    "email": "mahima@example.com",
    "password": "Mahima@123",
    "age": 27,
    "gender": "Female",
    "location": "Kolkata",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-82",
    "bio": "Demo profile for testing. Backend developer based in Kolkata, interested in reliable APIs and well-designed data models. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Node.js",
      "Express",
      "MongoDB",
      "PostgreSQL"
    ],
    "interests": [
      "Photography",
      "Chess",
      "Cooking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Mansi",
    "lastName": "Verma",
    "email": "mansi@example.com",
    "password": "Mansi@123",
    "age": 28,
    "gender": "Female",
    "location": "Ahmedabad",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-83",
    "bio": "Demo profile for testing. Full-stack developer based in Ahmedabad, interested in useful products from interface to database. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "Node.js",
      "TypeScript",
      "PostgreSQL"
    ],
    "interests": [
      "Reading",
      "Music",
      "Gaming"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Megha",
    "lastName": "Gupta",
    "email": "megha@example.com",
    "password": "Megha@123",
    "age": 29,
    "gender": "Female",
    "location": "Jaipur",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-84",
    "bio": "Demo profile for testing. AI engineer based in Jaipur, interested in practical AI tools and thoughtful experiments. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "PyTorch",
      "FastAPI",
      "SQL"
    ],
    "interests": [
      "Hiking",
      "Travel",
      "Cycling"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Neha",
    "lastName": "Mehta",
    "email": "neha@example.com",
    "password": "Neha@123",
    "age": 30,
    "gender": "Female",
    "location": "Lucknow",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-85",
    "bio": "Demo profile for testing. Mobile developer based in Lucknow, interested in smooth mobile experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React Native",
      "Expo",
      "TypeScript",
      "Firebase"
    ],
    "interests": [
      "Chess",
      "Cooking",
      "Open source"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Nidhi",
    "lastName": "Kapoor",
    "email": "nidhi@example.com",
    "password": "Nidhi@123",
    "age": 31,
    "gender": "Female",
    "location": "Gorakhpur",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-86",
    "bio": "Demo profile for testing. Cloud engineer based in Gorakhpur, interested in repeatable deployments and reliable infrastructure. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "AWS",
      "Docker",
      "Linux",
      "Terraform"
    ],
    "interests": [
      "Music",
      "Gaming",
      "Photography"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Pallavi",
    "lastName": "Malhotra",
    "email": "pallavi@example.com",
    "password": "Pallavi@123",
    "age": 32,
    "gender": "Female",
    "location": "Noida",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-87",
    "bio": "Demo profile for testing. Data engineer based in Noida, interested in clean datasets and dependable data pipelines. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "SQL",
      "Spark",
      "Airflow"
    ],
    "interests": [
      "Travel",
      "Cycling",
      "Reading"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Prachi",
    "lastName": "Agarwal",
    "email": "prachi@example.com",
    "password": "Prachi@123",
    "age": 33,
    "gender": "Female",
    "location": "Indore",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-88",
    "bio": "Demo profile for testing. UI engineer based in Indore, interested in design systems and inclusive interactions. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "JavaScript",
      "CSS",
      "Figma",
      "React"
    ],
    "interests": [
      "Cooking",
      "Open source",
      "Hiking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Prisha",
    "lastName": "Saxena",
    "email": "prisha@example.com",
    "password": "Prisha@123",
    "age": 34,
    "gender": "Female",
    "location": "Kochi",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-89",
    "bio": "Demo profile for testing. Platform developer based in Kochi, interested in developer tooling and service observability. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Go",
      "Docker",
      "PostgreSQL",
      "Linux"
    ],
    "interests": [
      "Gaming",
      "Photography",
      "Chess"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Rachana",
    "lastName": "Mishra",
    "email": "rachana@example.com",
    "password": "Rachana@123",
    "age": 35,
    "gender": "Female",
    "location": "Chandigarh",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-90",
    "bio": "Demo profile for testing. Quality engineer based in Chandigarh, interested in clear test strategies and robust releases. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Playwright",
      "Cypress",
      "JavaScript",
      "SQL"
    ],
    "interests": [
      "Cycling",
      "Reading",
      "Music"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Radhika",
    "lastName": "Iyer",
    "email": "radhika@example.com",
    "password": "Radhika@123",
    "age": 36,
    "gender": "Female",
    "location": "Bengaluru",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-91",
    "bio": "Demo profile for testing. Frontend developer based in Bengaluru, interested in accessible interfaces and fast web experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "TypeScript",
      "CSS",
      "Next.js"
    ],
    "interests": [
      "Open source",
      "Hiking",
      "Travel"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Rashmi",
    "lastName": "Nair",
    "email": "rashmi@example.com",
    "password": "Rashmi@123",
    "age": 37,
    "gender": "Female",
    "location": "Mumbai",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-92",
    "bio": "Demo profile for testing. Backend developer based in Mumbai, interested in reliable APIs and well-designed data models. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Node.js",
      "Express",
      "MongoDB",
      "PostgreSQL"
    ],
    "interests": [
      "Photography",
      "Chess",
      "Cooking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Ritika",
    "lastName": "Menon",
    "email": "ritika@example.com",
    "password": "Ritika@123",
    "age": 38,
    "gender": "Female",
    "location": "Delhi",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-93",
    "bio": "Demo profile for testing. Full-stack developer based in Delhi, interested in useful products from interface to database. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React",
      "Node.js",
      "TypeScript",
      "PostgreSQL"
    ],
    "interests": [
      "Reading",
      "Music",
      "Gaming"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Sakshi",
    "lastName": "Rao",
    "email": "sakshi@example.com",
    "password": "Sakshi@123",
    "age": 39,
    "gender": "Female",
    "location": "Hyderabad",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-94",
    "bio": "Demo profile for testing. AI engineer based in Hyderabad, interested in practical AI tools and thoughtful experiments. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "PyTorch",
      "FastAPI",
      "SQL"
    ],
    "interests": [
      "Hiking",
      "Travel",
      "Cycling"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Sanjana",
    "lastName": "Reddy",
    "email": "sanjana@example.com",
    "password": "Sanjana@123",
    "age": 40,
    "gender": "Female",
    "location": "Pune",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-95",
    "bio": "Demo profile for testing. Mobile developer based in Pune, interested in smooth mobile experiences. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "React Native",
      "Expo",
      "TypeScript",
      "Firebase"
    ],
    "interests": [
      "Chess",
      "Cooking",
      "Open source"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Shreya",
    "lastName": "Desai",
    "email": "shreya@example.com",
    "password": "Shreya@123",
    "age": 22,
    "gender": "Female",
    "location": "Chennai",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-96",
    "bio": "Demo profile for testing. Cloud engineer based in Chennai, interested in repeatable deployments and reliable infrastructure. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "AWS",
      "Docker",
      "Linux",
      "Terraform"
    ],
    "interests": [
      "Music",
      "Gaming",
      "Photography"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Simran",
    "lastName": "Shah",
    "email": "simran@example.com",
    "password": "Simran@123",
    "age": 23,
    "gender": "Female",
    "location": "Kolkata",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-97",
    "bio": "Demo profile for testing. Data engineer based in Kolkata, interested in clean datasets and dependable data pipelines. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Python",
      "SQL",
      "Spark",
      "Airflow"
    ],
    "interests": [
      "Travel",
      "Cycling",
      "Reading"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Sonali",
    "lastName": "Joshi",
    "email": "sonali@example.com",
    "password": "Sonali@123",
    "age": 24,
    "gender": "Female",
    "location": "Ahmedabad",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-98",
    "bio": "Demo profile for testing. UI engineer based in Ahmedabad, interested in design systems and inclusive interactions. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "JavaScript",
      "CSS",
      "Figma",
      "React"
    ],
    "interests": [
      "Cooking",
      "Open source",
      "Hiking"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Swati",
    "lastName": "Kulkarni",
    "email": "swati@example.com",
    "password": "Swati@123",
    "age": 25,
    "gender": "Female",
    "location": "Jaipur",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-99",
    "bio": "Demo profile for testing. Platform developer based in Jaipur, interested in developer tooling and service observability. Looking to collaborate on weekend side projects and exchange ideas with other developers.",
    "skills": [
      "Go",
      "Docker",
      "PostgreSQL",
      "Linux"
    ],
    "interests": [
      "Gaming",
      "Photography",
      "Chess"
    ],
    "usagePlan": "Basic"
  },
  {
    "firstName": "Vani",
    "lastName": "Patil",
    "email": "vani@example.com",
    "password": "Vani@123",
    "age": 26,
    "gender": "Female",
    "location": "Lucknow",
    "photoUrl": "https://api.dicebear.com/9.x/avataaars/svg?seed=devtinder-demo-100",
    "bio": "Demo profile for testing. Quality engineer based in Lucknow, interested in clear test strategies and robust releases. Looking to collaborate on open-source projects and exchange ideas with other developers.",
    "skills": [
      "Playwright",
      "Cypress",
      "JavaScript",
      "SQL"
    ],
    "interests": [
      "Cycling",
      "Reading",
      "Music"
    ],
    "usagePlan": "Basic"
  }
];

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--apply")) {
    throw new Error("Usage: node scripts/seed-demo-users.mjs [--apply]");
  }
  assert.equal(users.length, 100);
  assert.equal(new Set(users.map((user) => user.email)).size, 100);
  for (const user of users) {
    await new User(user).validate();
    const { email, password, usagePlan, ...profile } = user;
    assert.equal(validateProfileData(profile), null, "Profile validation failed.");
    const { usagePlan: ignored, ...signup } = user;
    assert.ok(sanitizeUserData(signup, SIGNUP_FIELDS), "Signup field validation failed.");
    assert.equal(password, user.firstName + "@123");
    assert.equal(email, user.firstName.toLowerCase() + "@example.com");
  }
  console.log("Validated 100 complete demo profiles against the current schema and profile rules.");
  console.table(users.slice(0, 5).map(({ firstName, lastName, email, location }) =>
    ({ name: firstName + " " + lastName, email, location })));
  if (!args.includes("--apply")) {
    console.log("Validation only: no database connection or writes. Add --apply to insert.");
    return;
  }
  if (!process.env.DB_CONNECTION_STRING) {
    throw new Error("DB_CONNECTION_STRING is missing. Run from backend with its configured .env.");
  }
  let inserted = 0;
  let skipped = 0;
  try {
    await mongoose.connect(process.env.DB_CONNECTION_STRING, {
      serverSelectionTimeoutMS: 15000,
    });
    // Do not auto-create indexes or alter existing records.
    const indexes = await User.collection.indexes();
    assert.ok(indexes.some((index) =>
      index.unique && index.key.email === 1 && Object.keys(index.key).length === 1
    ), "A unique email index must exist before seeding.");
    console.log("Target database:", mongoose.connection.name);
    for (const data of users) {
      if (await User.exists({ email: data.email })) {
        skipped++;
        continue;
      }
      try {
        const user = new User(data);
        // save() runs the existing bcrypt pre-save hook; insertMany() would not.
        await user.save();
        inserted++;
        assert.notEqual(user.password, data.password, "Password was not hashed.");
        assert.ok(await user.validatePassword(data.password), "Password verification failed.");
      } catch (error) {
        if (error.code === 11000 && await User.exists({ email: data.email })) {
          skipped++;
          continue;
        }
        throw error;
      }
    }
    console.log(`Finished: ${inserted} inserted; ${skipped} existing addresses skipped.`);
    console.log("Existing users were not overwritten. No welcome emails were queued.");
  } finally {
    await mongoose.disconnect();
  }
}
main().catch((error) => {
  // Avoid printing connection strings or full database error payloads.
  console.error("Seeding stopped:", error.name, error.code || "");
  if (error.name === "AssertionError" || error.message.startsWith("Usage:") ||
      error.message.startsWith("DB_CONNECTION_STRING")) console.error(error.message);
  console.error("Any completed inserts remain. A rerun skips existing addresses.");
  process.exitCode = 1;
});
