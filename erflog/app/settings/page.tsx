"use client";

export default function Settings() {
  return (
    <div className="min-h-screen bg-canvas py-12 px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-serif-bold text-4xl text-ink mb-4">
          Evolution Settings
        </h1>
        <p className="text-secondary mb-8">
          Configure your Erflog experience and agent preferences.
        </p>

        <div className="space-y-6">
          {/* Profile Section */}
          <div
            className="bg-surface border border-surface rounded-lg p-6"
            style={{ borderColor: "#E5E0D8" }}
          >
            <h2 className="font-serif-bold text-2xl text-ink mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: "#E5E0D8", color: "#1A1A1A" }}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-surface rounded-lg focus:outline-none focus:ring-2"
                  style={{ borderColor: "#E5E0D8", color: "#1A1A1A" }}
                  placeholder="your.email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Agent Preferences Section */}
          <div
            className="bg-surface border border-surface rounded-lg p-6"
            style={{ borderColor: "#E5E0D8" }}
          >
            <h2 className="font-serif-bold text-2xl text-ink mb-4">
              Agent Preferences
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  id="notifications"
                  defaultChecked
                  className="h-4 w-4"
                  style={{ accentColor: "#D95D39" }}
                />
                <label htmlFor="notifications" className="text-ink font-medium">
                  Enable real-time notifications
                </label>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  id="auto-analyze"
                  defaultChecked
                  className="h-4 w-4"
                  style={{ accentColor: "#D95D39" }}
                />
                <label htmlFor="auto-analyze" className="text-ink font-medium">
                  Auto-analyze new opportunities
                </label>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div
            className="bg-surface border border-surface rounded-lg p-6"
            style={{ borderColor: "#E5E0D8" }}
          >
            <h2 className="font-serif-bold text-2xl text-ink mb-4">
              About Erflog
            </h2>
            <p className="text-ink text-sm leading-relaxed">
              Erflog is your personal career intelligence platform powered by
              advanced agent swarms. Our system analyzes job opportunities and
              creates personalized learning roadmaps to help you achieve your
              career goals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
