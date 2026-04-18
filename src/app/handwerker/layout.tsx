import { Toaster } from 'sonner'

export default function HandwerkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-center" richColors closeButton duration={5000} />
    </>
  )
}
