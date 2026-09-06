
"use client"

import { useToast } from "@/hooks/use-toast"
import { AlertCircle, Info } from "lucide-react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider swipeDirection="up">
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const destructive = props.variant === "destructive"
        const Icon = destructive ? AlertCircle : Info
        return (
          <Toast key={id} {...props}>
            <div className="flex min-w-0 flex-1 items-start gap-3 p-4 pr-12">
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col items-start gap-4">
                <div className="flex w-full min-w-0 flex-col gap-1 break-words">
                  {title && <ToastTitle>{title}</ToastTitle>}
                  {description && (
                    <ToastDescription>{description}</ToastDescription>
                  )}
                </div>
                {action}
              </div>
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
