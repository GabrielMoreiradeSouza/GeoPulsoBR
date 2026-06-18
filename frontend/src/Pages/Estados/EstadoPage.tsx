import { useParams } from 'react-router-dom'
import goiasImg from '../../assets/images/goias.jpg'
import matogrossoImg from '../../assets/images/mato-grosso.jpeg'

const STATE_IMAGES: Record<string, string> = {
  'goias': goiasImg,
  'mato-grosso': matogrossoImg,
}

export const EstadoPage = () => {
  const { slug } = useParams<{ slug: string }>()

  const key = slug
    ? slug.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    : null

  const image = key ? STATE_IMAGES[key] : null

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0a0a0a',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {image && (
        <img
          src={image}
          alt={slug ?? ''}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}
    </div>
  )
}

export default EstadoPage