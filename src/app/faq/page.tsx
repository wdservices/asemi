
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqItems = [
  {
    question: "What is Asemi?",
    answer: "Asemi is an online learning platform that offers a wide range of expert-led video courses and a marketplace for powerful, customizable AI tools designed to enhance your skills and workflow."
  },
  {
    question: "How do I enroll in a course?",
    answer: "To enroll, simply navigate to the course you're interested in, click on the purchase button, and complete the payment process. If it's a free course, you can enroll directly. Once enrolled, the course will appear in your dashboard."
  },
  {
    question: "What do I get when I purchase an AI tool?",
    answer: "When you purchase an AI tool from our marketplace, you get access to the tool itself along with basic customization options, such as adding your own logo and brand colors. You'll receive instructions on how to access and configure your tool after purchase."
  },
  {
    question: "Is there a free trial available?",
    answer: "We do not offer a site-wide free trial, but many of our courses have free preview lessons that you can watch to get a feel for the content and teaching style before you decide to buy."
  },
  {
    question: "How can I reset my password?",
    answer: "If you've forgotten your password, you can go to the login page and click the 'Forgot Password?' link. You'll be prompted to enter your email address, and we'll send you a link to reset your password."
  },
  {
    question: "How can I contact support?",
    answer: "If your question isn't answered here, please visit our Contact Us page or email us directly at hello.wdservices@gmail.com. We're happy to help!"
  }
];

export default function FAQPage() {
  return (
    <div className="space-y-12">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Frequently Asked Questions</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Have questions? We've got answers. If you can't find what you're looking for, feel free to contact us.
        </p>
      </section>

      {/* FAQ Accordion Section */}
      <section>
        <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
          {faqItems.map((item, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger className="text-left font-semibold text-lg hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
