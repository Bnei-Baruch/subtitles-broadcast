import React from 'react'
import { Outlet } from 'react-router-dom'
import UserService from '../Services/KeycloakServices'
import { useSelector } from 'react-redux'

const HeaderBar = () => {

  const userProfile=useSelector((state)=>state?.UserProfile?.userProfile)
 
  
  return (
    <>
<div className="main-body">
<div className="top-header d-flex justify-content-between">
    <input className="form-control me-2" type="search" placeholder="Search" aria-label="Search"/>
      <div className='d-flex aligne-item-center'>
      <div class="btn-group list-btn">
        <button class="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        <img class="" src="image/account-circle.svg" id="dropdownMenuButton1" data-bs-toggle="dropdown" aria-expanded="false"/>
        <span className='m-2'>{userProfile?.profile?.firstName}</span>

        </button>
        <ul class="dropdown-menu">
          <li><a class="dropdown-item" href="#">Menu item</a></li>
          <li><a class="dropdown-item" href="#">Menu item</a></li>
          <li><a class="dropdown-item" onClick={()=>userProfile?.keycloak?.logout()} href="#">Logout</a></li>
        </ul>
    </div>
    <div class="btn-group list-btn">
        <button class="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        <img class="" src="image/Globe.svg" id="dropdownMenuButton1" data-bs-toggle="dropdown" aria-expanded="false"/>
        <span className='m-2'>EN</span>
        </button>
        <ul class="dropdown-menu">
          <li><a class="dropdown-item" href="#">Menu item</a></li>
          <li><a class="dropdown-item" href="#">Menu item</a></li>
          <li><a class="dropdown-item" href="#">Menu item</a></li>
        </ul>
    </div>
        
      </div>
</div>
<Outlet/>
</div>
    </>
  )
}

export default HeaderBar