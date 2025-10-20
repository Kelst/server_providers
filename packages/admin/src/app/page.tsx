export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="bg-white rounded-2xl shadow-xl p-12">
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              🚀 API Gateway Admin
            </h1>
            <p className="text-xl text-gray-600">
              Admin Panel - Coming Soon
            </p>
          </div>

          <div className="space-y-4 text-left bg-gray-50 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Planned Features:
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-green-500 mr-3 text-xl">✓</span>
                <span className="text-gray-700">Authentication & Authorization</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 text-xl">✓</span>
                <span className="text-gray-700">API Token Management (CRUD)</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 text-xl">✓</span>
                <span className="text-gray-700">Analytics Dashboard</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 text-xl">✓</span>
                <span className="text-gray-700">Request Logs & Monitoring</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-3 text-xl">✓</span>
                <span className="text-gray-700">Rate Limiting Configuration</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-gray-600 mb-4">
              Backend API documentation available at:
            </p>
            <a
              href="http://localhost:3000/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              📚 View Swagger Docs
            </a>
          </div>

          <div className="mt-6 text-sm text-gray-500">
            <p>Backend: <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:3000</code></p>
            <p>Admin Panel: <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:3001</code></p>
          </div>
        </div>
      </div>
    </div>
  )
}
