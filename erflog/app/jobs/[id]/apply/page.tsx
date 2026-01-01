"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "@/lib/SessionContext";
import { generateApplication, generateKit, getErrorMessage } from "@/lib/api";
import { Loader2, Download, Copy, Check, AlertCircle } from "lucide-react";

export default function ApplyPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const { profile, strategyJobs, sessionId, application, runApplication } =
    useSession();

  // Find job from strategy jobs
  const job = strategyJobs.find((j) => j.id === jobId) || {
    title: "Job Position",
    company: "Company",
    description: "",
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<{
    pdfUrl?: string;
    recruiterEmail?: string;
    rewrittenContent?: Record<string, unknown>;
  } | null>(null);

  const [formData, setFormData] = useState({
    whyJoin: "",
    shortDescription: "",
    additionalInfo: "",
  });

  const [copied, setCopied] = useState<string | null>(null);

  // Load from session application if available
  useEffect(() => {
    if (application) {
      setGeneratedContent({
        pdfUrl: application.pdf_url,
        recruiterEmail: application.recruiter_email,
        rewrittenContent: application.rewritten_content,
      });
    }
  }, [application]);

  const handleGenerateApplication = async () => {
    if (!sessionId) {
      setError("No active session. Please upload your resume first.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const success = await runApplication(job.description);
      if (success) {
        // Content will be loaded from useEffect when application updates
      } else {
        setError("Failed to generate application materials.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateKit = async () => {
    if (!profile) {
      setError("No profile found. Please upload your resume first.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateKit(profile.name, job.title, job.company);

      if (result instanceof Blob) {
        // Download the PDF
        const url = window.URL.createObjectURL(result);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Resume_${job.company.replace(/\s+/g, "_")}_${job.title
          .replace(/\s+/g, "_")
          .substring(0, 20)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCopy = (field: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownloadResume = () => {
    if (generatedContent?.pdfUrl) {
      window.open(generatedContent.pdfUrl, "_blank");
    } else {
      handleGenerateKit();
    }
  };

  // Sample AI-generated responses (fallback if not generated)
  const generatedResponses = {
    whyJoin:
      generatedContent?.recruiterEmail ||
      `I am excited about the opportunity to join ${job.company} because of its innovative approach to technology and commitment to excellence. The ${job.title} role aligns perfectly with my career aspirations and technical expertise. I am particularly drawn to the company's culture of continuous learning and the opportunity to work on impactful projects that make a real difference.`,
    shortDescription: `I am a passionate software engineer with hands-on experience in building scalable applications and solving complex technical challenges. My background includes working with cross-functional teams to deliver high-quality solutions on time. I thrive in collaborative environments and am constantly seeking to expand my technical knowledge and contribute meaningfully to team success.`,
    additionalInfo: `Throughout my career, I have demonstrated strong problem-solving abilities and a commitment to writing clean, maintainable code. I am experienced in agile methodologies and have a track record of quickly adapting to new technologies and frameworks. I am confident that my skills and enthusiasm would make me a valuable addition to the ${job.company} team.`,
  };

  return (
    <div className="min-h-screen bg-canvas py-12 px-8">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="mb-8 flex items-center gap-2 text-secondary hover:text-ink transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Job Details
      </button>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-serif-bold text-4xl text-ink mb-3">
            Apply to {job.company}
          </h1>
          <p className="text-xl text-secondary">{job.title}</p>
        </div>

        {/* Resume Download Section */}
        <div
          className="bg-surface rounded-xl border p-8 mb-8"
          style={{ borderColor: "#E5E0D8" }}
        >
          <div className="flex items-start gap-6">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#D95D39" }}
            >
              <Download className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-serif-bold text-2xl text-ink mb-2">
                Your Optimized Resume
              </h2>
              <p className="text-secondary mb-6">
                {generatedContent?.pdfUrl
                  ? "Your tailored resume is ready for download."
                  : `Generate a tailored resume highlighting the skills and experiences most relevant to this position at ${job.company}.`}
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                {!generatedContent && (
                  <button
                    onClick={handleGenerateApplication}
                    disabled={isGenerating || !sessionId}
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-lg font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "#D95D39" }}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                    Generate Application Kit
                  </button>
                )}

                <button
                  onClick={handleDownloadResume}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-3 px-6 py-3 rounded-lg font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    backgroundColor: generatedContent?.pdfUrl
                      ? "#D95D39"
                      : "#6b7280",
                  }}
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  {generatedContent?.pdfUrl
                    ? "Download Resume"
                    : "Download Sample Resume"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Application Questions Section */}
        <div
          className="bg-surface rounded-xl border p-8"
          style={{ borderColor: "#E5E0D8" }}
        >
          <h2 className="font-serif-bold text-2xl text-ink mb-6">
            Application Responses
          </h2>
          <p className="text-secondary mb-8">
            Use these AI-generated responses for common application questions.
            Click the copy button to copy to clipboard, or edit as needed in the
            text area.
          </p>

          {/* Why do you want to join */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label className="font-serif-bold text-lg text-ink">
                Why do you want to join {job.company}?
              </label>
              <button
                onClick={() =>
                  handleCopy(
                    "whyJoin",
                    formData.whyJoin || generatedResponses.whyJoin
                  )
                }
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                {copied === "whyJoin" ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <textarea
              value={formData.whyJoin || generatedResponses.whyJoin}
              onChange={(e) => handleInputChange("whyJoin", e.target.value)}
              rows={5}
              className="w-full px-4 py-3 rounded-lg border bg-white text-ink resize-none focus:outline-none focus:ring-2"
              style={
                {
                  borderColor: "#E5E0D8",
                  "--tw-ring-color": "#D95D39",
                } as React.CSSProperties
              }
              placeholder="Edit or use the generated response..."
            />
          </div>

          {/* Short Description */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label className="font-serif-bold text-lg text-ink">
                Your Short Description
              </label>
              <button
                onClick={() =>
                  handleCopy(
                    "shortDescription",
                    formData.shortDescription ||
                      generatedResponses.shortDescription
                  )
                }
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                {copied === "shortDescription" ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <textarea
              value={
                formData.shortDescription || generatedResponses.shortDescription
              }
              onChange={(e) =>
                handleInputChange("shortDescription", e.target.value)
              }
              rows={5}
              className="w-full px-4 py-3 rounded-lg border bg-white text-ink resize-none focus:outline-none focus:ring-2"
              style={
                {
                  borderColor: "#E5E0D8",
                  "--tw-ring-color": "#D95D39",
                } as React.CSSProperties
              }
              placeholder="Edit or use the generated response..."
            />
          </div>

          {/* Additional Information */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label className="font-serif-bold text-lg text-ink">
                Additional Information
              </label>
              <button
                onClick={() =>
                  handleCopy(
                    "additionalInfo",
                    formData.additionalInfo || generatedResponses.additionalInfo
                  )
                }
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                {copied === "additionalInfo" ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <textarea
              value={
                formData.additionalInfo || generatedResponses.additionalInfo
              }
              onChange={(e) =>
                handleInputChange("additionalInfo", e.target.value)
              }
              rows={5}
              className="w-full px-4 py-3 rounded-lg border bg-white text-ink resize-none focus:outline-none focus:ring-2"
              style={
                {
                  borderColor: "#E5E0D8",
                  "--tw-ring-color": "#D95D39",
                } as React.CSSProperties
              }
              placeholder="Edit or use the generated response..."
            />
          </div>

          {/* Tips Section */}
          <div
            className="p-5 rounded-lg bg-orange-50 border"
            style={{ borderColor: "#D95D39" }}
          >
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 flex-shrink-0 mt-0.5"
                style={{ color: "#D95D39" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="font-medium text-ink mb-1">Pro Tips</h4>
                <ul className="text-sm text-secondary space-y-1">
                  <li>
                    • Personalize the generated responses with specific examples
                    from your experience
                  </li>
                  <li>
                    • Mention specific projects or technologies that align with
                    the job requirements
                  </li>
                  <li>• Keep your responses concise but impactful</li>
                  <li>
                    • Research {job.company} to add company-specific details
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => router.back()}
            className="flex-1 py-4 rounded-lg font-medium border transition-all hover:bg-gray-50"
            style={{ borderColor: "#E5E0D8" }}
          >
            Back to Job Details
          </button>
          <button
            onClick={() => router.push("/jobs")}
            className="flex-1 py-4 rounded-lg font-medium text-white transition-all hover:opacity-90"
            style={{ backgroundColor: "#D95D39" }}
          >
            Browse More Jobs
          </button>
        </div>
      </div>
    </div>
  );
}
