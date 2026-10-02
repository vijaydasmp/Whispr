import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Whispr</h1>
          <Link 
            href="/login" 
            className="px-4 py-2 bg-dash-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Sign in with Dash
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center max-w-2xl">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Say it without saying who you are.
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Communities powered by Dash Platform.
          </p>
          <Link 
            href="/login" 
            className="inline-block px-8 py-3 bg-dash-blue text-white text-lg rounded-lg hover:bg-blue-600 transition-colors"
          >
            Sign in with Dash
          </Link>
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-3 gap-8 max-w-4xl">
          <div className="text-center p-6">
            <div className="text-3xl mb-3">🏛️</div>
            <h3 className="font-semibold text-gray-900 mb-2">Decentralized</h3>
            <p className="text-gray-600 text-sm">
              Forums live on Dash Platform — no centralized server.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-3xl mb-3">🔐</div>
            <h3 className="font-semibold text-gray-900 mb-2">Identity</h3>
            <p className="text-gray-600 text-sm">
              Login with your Dash Platform testnet identity.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-3xl mb-3">🎭</div>
            <h3 className="font-semibold text-gray-900 mb-2">Pseudonymous</h3>
            <p className="text-gray-600 text-sm">
              Post anonymously with a generated display name.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-gray-500 text-sm">
          Whispr MVP — Dash Platform Testnet Only —{' '}
          <span className="text-dash-blue">Not for production use</span>
        </div>
      </footer>
    </div>
  );
}