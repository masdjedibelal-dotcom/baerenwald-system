import 'server-only'

type ForecastItem = {
  main: { temp: number }
  weather: { main: string }[]
}

export async function getWetter(): Promise<string> {
  const key = process.env.OPENWEATHER_API_KEY?.trim()
  if (!key) return ''

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=Munich,DE&appid=${key}&units=metric&lang=de&cnt=8`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return ''
    const data = (await res.json()) as { list?: ForecastItem[] }
    const list = data.list ?? []
    if (list.length < 4) return ''

    const heute = list.slice(0, 4)
    const morgen = list.slice(4, 8)

    const avgTemp = (items: ForecastItem[]) =>
      Math.round(items.reduce((a, b) => a + b.main.temp, 0) / items.length)

    const regen = (items: ForecastItem[]) =>
      items.some((i) => i.weather[0]?.main?.toLowerCase().includes('rain'))

    const heuteTemp = avgTemp(heute)
    const morgenTemp = avgTemp(morgen)
    const heuteRegen = regen(heute)
    const morgenRegen = regen(morgen)

    return [
      `☀️ Heute: ${heuteTemp}°C${heuteRegen ? ' 🌧 Regen erwartet' : ''}`,
      `📅 Morgen: ${morgenTemp}°C${morgenRegen ? ' 🌧 Regen erwartet' : ''}`,
    ].join('\n')
  } catch {
    return ''
  }
}
