// UI Debug utilities
export function debugUIState() {
  console.log('🔍 UI Debug Report')
  console.log('==================')
  
  // Check authentication state
  console.log('1. Authentication:')
  const authStore = (window as any).__ZUSTAND_STORES__?.auth || 'Not found'
  console.log('   Auth store:', authStore)
  
  // Check if buttons exist in DOM
  console.log('2. UI Elements:')
  const createButtonAlt = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent?.includes('Neuen Beitrag') || btn.textContent?.includes('erstellen')
  )
  console.log('   Create post button found:', !!createButtonAlt)
  if (createButtonAlt) {
    console.log('   Button text:', createButtonAlt.textContent)
    console.log('   Button classes:', createButtonAlt.className)
    console.log('   Button style:', getComputedStyle(createButtonAlt).display)
  }
  
  // Check if primary colors are working
  console.log('3. CSS/Styling:')
  const testDiv = document.createElement('div')
  testDiv.className = 'bg-primary-600 text-white'
  testDiv.style.display = 'none'
  document.body.appendChild(testDiv)
  const computedStyle = getComputedStyle(testDiv)
  console.log('   Primary-600 background:', computedStyle.backgroundColor)
  console.log('   Text color:', computedStyle.color)
  document.body.removeChild(testDiv)
  
  // Check forum store state
  console.log('4. Forum State:')
  const forumStore = (window as any).__ZUSTAND_STORES__?.forum || 'Not found'
  console.log('   Forum store:', forumStore)
  
  // List all buttons on page
  console.log('5. All Buttons on Page:')
  const allButtons = Array.from(document.querySelectorAll('button'))
  allButtons.forEach((btn, index) => {
    console.log(`   Button ${index + 1}: "${btn.textContent?.trim()}" - visible: ${getComputedStyle(btn).display !== 'none'}`)
  })
  
  console.log('==================')
}