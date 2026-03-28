import '../pages/dashboard/OwnerReviewPage.css'

export function ImageLightbox({ src, onClose }) {
  if (!src) return null
  return (
    <div className="img-lightbox" onClick={onClose}>
      <img src={src} alt="Screenshot" className="img-lightbox-img" />
    </div>
  )
}
