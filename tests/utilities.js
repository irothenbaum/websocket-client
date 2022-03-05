async function pause(duration) {
  return new Promise(r => setTimeout(r, duration))
}

export {pause}
