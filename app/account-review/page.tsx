import { Suspense } from "react"
import AccountReview from "../../account-review"


function AccountReviewFallback() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading...</p>
            </div>
        </div>
    )
}

export default function Page() {
    return (
        <Suspense fallback={<AccountReviewFallback />}>
            <AccountReview />
        </Suspense>
    )
}